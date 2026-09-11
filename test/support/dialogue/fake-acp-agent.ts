import { randomUUID } from 'node:crypto';
import { PassThrough, Readable, Writable } from 'node:stream';

import * as acp from '@agentclientprotocol/sdk';

/* oxlint-disable no-await-in-loop -- ACP commands are emitted in explicit scenario order. */

const option = (name: string): string => {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  if (value === undefined) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
};

const controlUrl = option('--control-url');
const token = option('--control-token');
const protocolOutput = new PassThrough();
protocolOutput.pipe(process.stdout);
const processId = randomUUID();
const providerSessionId = randomUUID();

const requestControl = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${controlUrl}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Control request failed: ${response.status} ${await response.text()}`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
};

const stream = acp.ndJsonStream(
  Writable.toWeb(protocolOutput),
  Readable.toWeb(process.stdin) as unknown as Parameters<typeof acp.ndJsonStream>[1],
);
let pendingCancellation: ReturnType<typeof Promise.withResolvers<acp.PromptResponse>> | undefined;
let configurationOptions: acp.SessionConfigOption[] = [
  {
    category: 'model',
    currentValue: 'model-a',
    id: 'model',
    name: 'Model',
    options: [
      { name: 'Model A', value: 'model-a' },
      { name: 'Model B', value: 'model-b' },
    ],
    type: 'select',
  },
];

acp
  .agent({ name: 'revo-dialogue-test-agent' })
  .onRequest(acp.methods.agent.initialize, () => ({
    agentCapabilities: { sessionCapabilities: { close: {} } },
    protocolVersion: acp.PROTOCOL_VERSION,
  }))
  .onRequest(acp.methods.agent.session.new, async () => {
    await requestControl('/session-new', { processId, pid: process.pid, providerSessionId });
    return {
      sessionId: providerSessionId,
      configOptions: configurationOptions,
    };
  })
  .onRequest(acp.methods.agent.session.setConfigOption, async ({ params }) => {
    await requestControl('/configuration', { id: params.configId, value: params.value });
    configurationOptions = configurationOptions.map((entry) => {
      if (entry.id !== params.configId) {
        return entry;
      }
      if (entry.type === 'boolean' && typeof params.value === 'boolean') {
        return { ...entry, currentValue: params.value };
      }
      if (entry.type === 'select' && typeof params.value === 'string') {
        return { ...entry, currentValue: params.value };
      }
      throw new Error(`Invalid value for configuration option ${params.configId}.`);
    });
    return { configOptions: configurationOptions };
  })
  .onRequest(acp.methods.agent.session.prompt, async (context) => {
    const prompt = context.params.prompt.find((block) => block.type === 'text');
    const { executionId } = await requestControl<{ readonly executionId: string }>('/prompt', {
      processId,
      prompt: prompt?.type === 'text' ? prompt.text : '',
    });
    while (true) {
      const command = await requestControl<
        | { readonly id: string; readonly kind: 'text'; readonly text: string }
        | {
            readonly id: string;
            readonly kind: 'tool';
            readonly toolCallId: string;
            readonly title: string;
            readonly status: 'pending' | 'in_progress' | 'completed' | 'failed';
          }
        | {
            readonly id: string;
            readonly kind: 'plan';
            readonly entries: readonly {
              readonly content: string;
              readonly priority: 'high' | 'medium' | 'low';
              readonly status: 'pending' | 'in_progress' | 'completed';
            }[];
          }
        | {
            readonly id: string;
            readonly kind:
              | 'permission'
              | 'input'
              | 'complete'
              | 'fail'
              | 'wait_for_cancellation'
              | 'exit';
          }
      >('/next-command', { executionId });
      if (command.kind === 'text') {
        await context.client.notify(acp.methods.client.session.update, {
          sessionId: context.params.sessionId,
          update: {
            content: { type: 'text', text: command.text },
            sessionUpdate: 'agent_message_chunk',
          },
        });
      }
      if (command.kind === 'permission') {
        void context.client.request(acp.methods.client.session.requestPermission, {
          sessionId: context.params.sessionId,
          options: [
            { kind: 'allow_once', name: 'Allow test action', optionId: 'allow-test-action' },
            { kind: 'reject_once', name: 'Reject test action', optionId: 'reject-test-action' },
          ],
          toolCall: {
            kind: 'execute',
            status: 'pending',
            title: 'Run test action',
            toolCallId: 'test-tool-call',
          },
        });
      }
      if (command.kind === 'input') {
        void context.client.request(acp.methods.client.elicitation.create, {
          sessionId: context.params.sessionId,
          message: 'Provide test input.',
          mode: 'form',
          requestedSchema: {
            type: 'object',
            properties: {
              answer: { type: 'string', title: 'Answer', minLength: 1, maxLength: 100 },
            },
            required: ['answer'],
          },
        });
      }
      if (command.kind === 'tool') {
        await context.client.notify(acp.methods.client.session.update, {
          sessionId: context.params.sessionId,
          update: {
            sessionUpdate: 'tool_call',
            toolCallId: command.toolCallId,
            title: command.title,
            kind: 'execute',
            status: command.status,
          },
        });
      }
      if (command.kind === 'plan') {
        await context.client.notify(acp.methods.client.session.update, {
          sessionId: context.params.sessionId,
          update: { sessionUpdate: 'plan', entries: command.entries },
        });
      }
      await requestControl('/command-complete', { executionId, commandId: command.id });
      if (command.kind === 'complete') {
        return { stopReason: 'end_turn' };
      }
      if (command.kind === 'fail') {
        throw acp.RequestError.internalError(
          { error: { message: 'Internal provider failure.' } },
          'Internal provider failure.',
        );
      }
      if (command.kind === 'exit') {
        process.exit(17);
      }
      if (command.kind === 'wait_for_cancellation') {
        pendingCancellation = Promise.withResolvers<acp.PromptResponse>();
        return pendingCancellation.promise;
      }
    }
  })
  .onNotification(acp.methods.agent.session.cancel, () => {
    pendingCancellation?.resolve({ stopReason: 'cancelled' });
    pendingCancellation = undefined;
  })
  .onRequest(acp.methods.agent.session.close, () => ({}))
  .connect(stream);
