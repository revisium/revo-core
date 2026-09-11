import type { AgentFault } from '@revisium/revo-agent-runtime';
import type { AgentSessionTurnOutcome } from '@revisium/revo-agent-runtime';
import { expect, test, vi } from 'vitest';

import { CompleteDialogueTurnHandler } from '../../../../src/features/dialogues/ingestion/commands/handlers/complete-dialogue-turn.handler.js';
import { publicFault } from '../../../../src/features/dialogues/management/runtime/dialogue-runtime-fault.js';
import { DispatchDialogueTurnHandler } from '../../../../src/features/dialogues/management/runtime/dispatch-dialogue-turn.handler.js';

test('uses the bounded provider reason when the runtime message is generic', () => {
  const fault = {
    code: 'revo.agent.protocol_failed',
    message: 'The provider session protocol operation failed.',
    phase: 'execution',
    retryable: false,
    details: {
      diagnostic: {
        provider: {
          code: 'invalid_request',
          name: 'ProviderError',
          message: 'Model is unavailable for this account.',
          data: { token: 'must-not-escape' },
        },
      },
    },
  } as unknown as AgentFault;

  expect(publicFault(fault)).toMatchObject({
    code: fault.code,
    message: 'Model is unavailable for this account.',
    phase: fault.phase,
    retryable: false,
  });
  expect(publicFault(fault)).not.toHaveProperty('details');
});

test('uses the nested provider error reason while omitting diagnostics from public faults', () => {
  const fault = {
    code: 'revo.agent.protocol_failed',
    message: 'The provider session protocol operation failed.',
    phase: 'execution',
    retryable: false,
    details: {
      diagnostic: {
        provider: {
          code: -32603,
          data: { error: { message: 'No LLM provider configured' } },
        },
      },
    },
  } as unknown as AgentFault;

  expect(publicFault(fault)).toMatchObject({ message: 'No LLM provider configured' });
  expect(publicFault(fault)).not.toHaveProperty('details');
});

test('projects a frozen timed-out outcome without mutating the runtime result', () => {
  const fault = {
    code: 'revo.agent.protocol_failed',
    message: 'The provider session protocol operation failed.',
    phase: 'session_running',
    retryable: true,
    details: {
      diagnostic: { provider: { data: { error: { message: 'Rate limit exceeded' } } } },
    },
  } as unknown as AgentFault;
  const outcome = Object.freeze({ status: 'timed_out', error: fault }) as AgentSessionTurnOutcome;
  const handler = Object.create(CompleteDialogueTurnHandler.prototype) as {
    publicTurnOutcome(value: AgentSessionTurnOutcome): AgentSessionTurnOutcome;
  };
  const projected = handler.publicTurnOutcome(outcome);

  expect(projected).toEqual({
    status: 'timed_out',
    error: {
      code: fault.code,
      message: 'Rate limit exceeded',
      phase: fault.phase,
      retryable: fault.retryable,
    },
  });
  expect(projected).not.toBe(outcome);
  expect(outcome).toEqual({ status: 'timed_out', error: fault });
});

test('public dialogue dispatch logs the raw structured turn fault', async () => {
  const fault = {
    code: 'revo.agent.protocol_failed',
    message: 'The provider session protocol operation failed.',
    phase: 'session_running',
    retryable: false,
    details: {
      diagnostic: {
        provider: { code: -32603, data: { error: { message: 'No provider configured' } } },
        stderr: 'provider warning',
      },
    },
  } as unknown as AgentFault;
  const logger = { error: vi.fn<(entry: unknown) => void>() };
  const turn = { result: () => Promise.resolve({ status: 'failed', error: fault }) };
  const handler = Object.assign(Object.create(DispatchDialogueTurnHandler.prototype), {
    logger,
    transactions: { runReadCommitted: async <T>(action: () => Promise<T>) => action() },
    beginDispatch: async () => true,
    getDialogue: async () => ({
      agentId: 'agent',
      agentVersion: '1',
      runtimeSessionId: 'session-1',
      agentConfiguration: { selections: { model: 'provider/model' } },
    }),
    bindRuntime: async () => undefined,
    cancelBeforeAdmission: async () => false,
    isCancellationRequested: async () => false,
    runtimeOperation: async <T>(
      _operation: string,
      _agentId: string,
      _version: string,
      _context: unknown,
      action: () => Promise<T>,
    ) => action(),
    sendToRuntime: async () => turn,
  }) as unknown as { handle(event: object): void };

  handler.handle({ dialogueId: 'dialogue-1', turnId: 'turn-1', prompt: 'prompt' });
  await vi.waitFor(() =>
    expect(
      logger.error.mock.calls.filter(
        ([entry]) =>
          typeof entry === 'object' &&
          entry !== null &&
          'operation' in entry &&
          entry.operation === 'dialogue.runtime.turn_result',
      ),
    ).toHaveLength(1),
  );

  expect(logger.error).toHaveBeenCalledWith(
    expect.objectContaining({
      operation: 'dialogue.runtime.turn_result',
      model: 'provider/model',
      error: expect.objectContaining({
        diagnostic: {
          provider: { code: -32603, data: { error: { message: 'No provider configured' } } },
          stderr: 'provider warning',
        },
      }),
    }),
  );
});
