import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AgentDefinitionInput } from '@revisium/revo-agent-runtime';
import request from 'supertest';

import { AppModule } from '../../../src/app.module.js';
import { agentRuntimeConfig } from '../../../src/config/agent-runtime.config.js';
import { DialogueEventIngestionApiService } from '../../../src/features/dialogue-event-ingestion/dialogue-event-ingestion-api.service.js';
import { DialogueExecution } from '../../../src/features/dialogue/application/dialogue-execution.js';
import { DialogueApiService } from '../../../src/features/dialogue/dialogue-api.service.js';
import { DispatchDialogueTurnHandler } from '../../../src/features/dialogue/events/dispatch-dialogue-turn.handler.js';
import { AGENT_DEFINITIONS } from '../../../src/infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionEventJournal } from '../../../src/infrastructure/agent-runtime/agent-session-event-journal.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { TransactionPrismaService } from '../../../src/infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../src/infrastructure/dialogue/dialogue-change-publisher.js';
import { DialogueEventReader } from '../../../src/infrastructure/dialogue/dialogue-event-reader.js';
import { ControllableDialogueChangePublisher } from './controllable-dialogue-change-publisher.js';
import { ControllableDialogueDispatchHandler } from './controllable-dialogue-dispatch.handler.js';
import { ControllableDialogueExecution } from './controllable-dialogue-execution.js';
import { ControllableTransactionPrismaService } from './controllable-transaction-prisma.service.js';
import { DialogueChangeStream } from './dialogue-change-stream.js';
import { DialogueScenarioAgent } from './dialogue-scenario-agent.js';
import type {
  CreatedDialogue,
  CreatedTurn,
  CreateDialogueOptions,
  DialogueHistoryItem,
  DialogueHistoryPage,
  DialogueInteraction,
  DialogueInteractionPage,
  DialogueSummaryPage,
  DialogueTurnPage,
  ForkedDialogue,
} from './dialogue-scenario.types.js';
import { DialogueStorageProbe } from './dialogue-storage-probe.js';
import { FakeAgentControl } from './fake-agent-control.js';
import { ObservedAgentSessionEventJournal } from './observed-agent-session-event-journal.js';

export type * from './dialogue-scenario.types.js';
export { DialogueChangeStream } from './dialogue-change-stream.js';

interface GraphqlResponse<Data> {
  readonly data?: Data;
  readonly errors?: readonly { readonly message: string }[];
}

const fakeAgentDefinition = (control: FakeAgentControl): AgentDefinitionInput => ({
  schemaVersion: 'agent-definition/v1',
  id: 'test-acp',
  version: '1.0.0',
  displayName: 'Dialogue test agent',
  launch: {
    command: process.execPath,
    args: [
      { kind: 'literal', value: '--import' },
      { kind: 'literal', value: import.meta.resolve('tsx') },
      {
        kind: 'literal',
        value: (() => {
          const source = fileURLToPath(new URL('./fake-acp-agent.ts', import.meta.url));
          return existsSync(source)
            ? source
            : fileURLToPath(new URL('./fake-acp-agent.js', import.meta.url));
        })(),
      },
      { kind: 'literal', value: '--control-url' },
      { kind: 'literal', value: control.address },
      { kind: 'literal', value: '--control-token' },
      { kind: 'literal', value: control.authorizationToken },
    ],
    versionProbe: { args: ['--version'], prefix: 'v', stream: 'stdout', timeoutMs: 1_000 },
  },
  protocol: { driver: 'acp/v1', permissionStrategy: 'acp/v1' },
  delivery: { prompt: 'protocol', resultSchema: 'protocol', result: 'protocol' },
  parameters: {
    schema: { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' },
  },
  permissions: {
    schema: { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' },
  },
  capabilities: {
    cancellation: true,
    structuredResult: true,
    usage: false,
    session: {
      multiTurn: true,
      resume: 'none',
      interactions: { input: true, permission: true },
      updates: { message: true, tool: true, usage: false, plan: true, progress: false },
    },
  },
});

export class DialogueScenarioClient {
  constructor(
    private readonly app: INestApplication,
    private readonly endpoint: string,
  ) {}

  async execute<Data>(query: string, variables?: Record<string, unknown>): Promise<Data> {
    const response = await request(this.app.getHttpServer()).post('/graphql').send({
      query,
      variables,
    });
    const body = response.body as GraphqlResponse<Data>;
    if (response.status !== 200) {
      throw new Error(`GraphQL HTTP ${response.status}: ${JSON.stringify(body.errors ?? body)}`);
    }
    if (body.errors !== undefined) {
      throw new Error(body.errors.map(({ message }) => message).join('\n'));
    }
    if (body.data === undefined) {
      throw new Error('GraphQL response did not include data.');
    }

    return body.data;
  }

  async createDialogue(options: CreateDialogueOptions = {}): Promise<CreatedDialogue> {
    const data = await this.execute<{ readonly createDialogue: CreatedDialogue }>(
      `
        mutation CreateDialogue($input: CreateDialogueInput!) {
          createDialogue(input: $input) {
            id
            status
            unreadCount
            lastOutcome
            pendingCount
            activeTurnId
            progress
            significantSequence
            readSignificantSequence
            runtimeSessionId
          }
        }
      `,
      {
        input: {
          title: options.title ?? 'Test dialogue',
          agentId: options.agentId ?? 'test-acp',
          agentVersion: options.agentVersion ?? '1.0.0',
          ...(options.agentConfiguration === undefined
            ? {}
            : { agentConfiguration: options.agentConfiguration }),
        },
      },
    );

    return data.createDialogue;
  }

  async dialogue(id: string): Promise<CreatedDialogue> {
    const data = await this.execute<{ readonly dialogue: CreatedDialogue }>(
      `
        query Dialogue($id: ID!) {
          dialogue(dialogueId: $id) {
            id
            status
            unreadCount
            lastOutcome
            pendingCount
            activeTurnId
            progress
            significantSequence
            readSignificantSequence
            runtimeSessionId
          }
        }
      `,
      { id },
    );

    return data.dialogue;
  }

  async send(
    dialogueId: string,
    prompt: string,
    commandId = crypto.randomUUID(),
  ): Promise<CreatedTurn> {
    const data = await this.execute<{ readonly sendDialogueMessage: CreatedTurn }>(
      `
        mutation SendDialogueMessage($input: SendDialogueInput!) {
          sendDialogueMessage(input: $input) { id status }
        }
      `,
      { input: { dialogueId, commandId, prompt } },
    );
    return data.sendDialogueMessage;
  }

  async history(dialogueId: string): Promise<readonly DialogueHistoryItem[]> {
    return (await this.historyPage(dialogueId)).edges.map(({ node }) => node);
  }

  async historyPage(
    dialogueId: string,
    first?: number,
    after?: string,
  ): Promise<DialogueHistoryPage> {
    const data = await this.execute<{ readonly dialogueHistory: DialogueHistoryPage }>(
      `
        query DialogueHistory($dialogueId: ID!, $first: Int, $after: String) {
          dialogueHistory(dialogueId: $dialogueId, first: $first, after: $after) {
            edges { node { id kind source status text version historical payload turnId } }
            snapshotCursor
            observedSignificantSequence
            totalCount
            pageInfo { endCursor hasNextPage }
          }
        }
      `,
      { dialogueId, first, after },
    );
    return data.dialogueHistory;
  }

  async historyItem(dialogueId: string, itemId: string): Promise<DialogueHistoryItem> {
    const data = await this.execute<{ readonly dialogueHistoryItem: DialogueHistoryItem }>(
      `
        query DialogueHistoryItem($dialogueId: ID!, $itemId: ID!) {
          dialogueHistoryItem(dialogueId: $dialogueId, itemId: $itemId) {
            id kind source status text version historical payload turnId
          }
        }
      `,
      { dialogueId, itemId },
    );
    return data.dialogueHistoryItem;
  }

  async subscribe(dialogueId: string, after: string): Promise<DialogueChangeStream> {
    return this.openSubscription(
      `
        subscription DialogueChanges($dialogueIds: [ID!], $after: String) {
          dialogueChanges(dialogueIds: $dialogueIds, after: $after) {
            cursor dialogueId kind itemId itemVersion baseItemVersion turnId textDelta
            item { id kind source status text version }
            summary { id status }
          }
        }
      `,
      { dialogueIds: [dialogueId], after },
    );
  }

  async subscribeAll(after: string): Promise<DialogueChangeStream> {
    return this.openSubscription(
      `
        subscription AllDialogueChanges($after: String) {
          dialogueChanges(after: $after) {
            cursor dialogueId kind itemId itemVersion baseItemVersion turnId textDelta
            item { id kind source status text version }
            summary { id status }
          }
        }
      `,
      { after },
    );
  }

  async subscribeSummaries(
    dialogueIds: readonly string[],
    after: string,
  ): Promise<DialogueChangeStream> {
    return this.openSubscription(
      `
        subscription DialogueSummaryChanges($dialogueIds: [ID!], $after: String) {
          dialogueChanges: dialogueSummaryChanges(dialogueIds: $dialogueIds, after: $after) {
            cursor dialogueId kind itemId textDelta
            summary {
              id status unreadCount pendingCount lastOutcome activeTurnId progress
              significantSequence readSignificantSequence
            }
          }
        }
      `,
      { dialogueIds: [...dialogueIds], after },
    );
  }

  async dialogues(first?: number, after?: string): Promise<DialogueSummaryPage> {
    const data = await this.execute<{ readonly dialogues: DialogueSummaryPage }>(
      `
        query Dialogues($first: Int, $after: String) {
          dialogues(first: $first, after: $after) {
            edges {
              cursor
              node {
                id status unreadCount pendingCount lastOutcome activeTurnId progress
                significantSequence readSignificantSequence
              }
            }
            snapshotCursor totalCount
            pageInfo { endCursor hasNextPage }
          }
        }
      `,
      { first, after },
    );
    return data.dialogues;
  }

  private async openSubscription(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<DialogueChangeStream> {
    const controller = new AbortController();
    const connectTimeout = setTimeout(
      () => controller.abort(new Error('Timed out opening the dialogue subscription.')),
      5_000,
    );
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(connectTimeout);
    }
    if (
      !response.ok ||
      response.body === null ||
      !response.headers.get('content-type')?.includes('text/event-stream')
    ) {
      controller.abort();
      throw new Error(`Dialogue subscription failed with status ${response.status}.`);
    }
    return new DialogueChangeStream(response.body.getReader(), controller);
  }

  async cancel(dialogueId: string, turnId: string): Promise<CreatedTurn> {
    const data = await this.execute<{ readonly cancelDialogueTurn: CreatedTurn }>(
      `
        mutation CancelDialogueTurn($dialogueId: ID!, $turnId: ID!) {
          cancelDialogueTurn(dialogueId: $dialogueId, turnId: $turnId) { id status }
        }
      `,
      { dialogueId, turnId },
    );
    return data.cancelDialogueTurn;
  }

  async markRead(dialogueId: string, through: string): Promise<CreatedDialogue> {
    const data = await this.execute<{ readonly markDialogueRead: CreatedDialogue }>(
      `
        mutation MarkDialogueRead($dialogueId: ID!, $through: String!) {
          markDialogueRead(dialogueId: $dialogueId, through: $through) {
            id status unreadCount pendingCount significantSequence readSignificantSequence
            activeTurnId progress lastOutcome
          }
        }
      `,
      { dialogueId, through },
    );
    return data.markDialogueRead;
  }

  async interactions(dialogueId: string): Promise<readonly DialogueInteraction[]> {
    return (await this.interactionsPage(dialogueId)).edges.map(({ node }) => node);
  }

  async interactionsPage(
    dialogueId: string,
    first?: number,
    after?: string,
  ): Promise<DialogueInteractionPage> {
    const data = await this.execute<{
      readonly dialogueInteractions: DialogueInteractionPage;
    }>(
      `
        query DialogueInteractions($dialogueId: ID!, $first: Int, $after: String) {
          dialogueInteractions(dialogueId: $dialogueId, first: $first, after: $after) {
            edges { cursor node { id dialogueId turnId status request response responseCommandId } }
            snapshotCursor totalCount
            pageInfo { endCursor hasNextPage }
          }
        }
      `,
      { dialogueId, first, after },
    );
    return data.dialogueInteractions;
  }

  async turnsPage(dialogueId: string, first?: number, after?: string): Promise<DialogueTurnPage> {
    const data = await this.execute<{ readonly dialogueTurns: DialogueTurnPage }>(
      `
        query DialogueTurns($dialogueId: ID!, $first: Int, $after: String) {
          dialogueTurns(dialogueId: $dialogueId, first: $first, after: $after) {
            edges {
              cursor
              node { id dialogueId commandId status dispatchState runtimeSessionId }
            }
            snapshotCursor totalCount
            pageInfo { endCursor hasNextPage }
          }
        }
      `,
      { dialogueId, first, after },
    );
    return data.dialogueTurns;
  }

  async respond(
    dialogueId: string,
    interactionId: string,
    commandId: string,
    response: unknown,
  ): Promise<DialogueInteraction> {
    const data = await this.execute<{ readonly respondDialogue: DialogueInteraction }>(
      `
        mutation RespondDialogue($input: RespondDialogueInput!) {
          respondDialogue(input: $input) { id status response }
        }
      `,
      { input: { dialogueId, interactionId, commandId, response } },
    );
    return data.respondDialogue;
  }

  async fork(dialogueId: string, turnId: string, title: string): Promise<ForkedDialogue> {
    const data = await this.execute<{ readonly forkDialogue: ForkedDialogue }>(
      `
        mutation ForkDialogue($input: ForkDialogueInput!) {
          forkDialogue(input: $input) {
            id status unreadCount lastOutcome originDialogueId originTurnId
          }
        }
      `,
      { input: { dialogueId, turnId, title } },
    );
    return data.forkDialogue;
  }

  async reopen(dialogueId: string): Promise<CreatedDialogue> {
    const data = await this.execute<{ readonly reopenDialogue: CreatedDialogue }>(
      `
        mutation ReopenDialogue($dialogueId: ID!) {
          reopenDialogue(dialogueId: $dialogueId) {
            id status unreadCount pendingCount lastOutcome activeTurnId progress
            significantSequence readSignificantSequence
          }
        }
      `,
      { dialogueId },
    );
    return data.reopenDialogue;
  }
}

export interface DialogueScenario {
  readonly app: INestApplication;
  readonly agent: DialogueScenarioAgent;
  readonly client: DialogueScenarioClient;
  readonly journal: AgentSessionEventJournal;
  readonly prisma: PrismaService;
  readonly storage: DialogueStorageProbe;
  readonly execution: ControllableDialogueExecution;
  readonly changes: ControllableDialogueChangePublisher;
  readonly dispatch: ControllableDialogueDispatchHandler;
  readonly transactions: ControllableTransactionPrismaService;
  recover(): Promise<void>;
  close(): Promise<void>;
}

export const startDialogueScenario = async (): Promise<DialogueScenario> => {
  const workspace = await mkdtemp(join(tmpdir(), 'revo-dialogue-scenario-'));
  const fake = new FakeAgentControl();
  let app: INestApplication | undefined;
  try {
    await fake.start();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AGENT_DEFINITIONS)
      .useValue([fakeAgentDefinition(fake)])
      .overrideProvider(agentRuntimeConfig.KEY)
      .useValue({ workspaceDirectory: workspace, inheritedEnvironmentNames: [] })
      .overrideProvider(TransactionPrismaService)
      .useClass(ControllableTransactionPrismaService)
      .overrideProvider(DialogueChangePublisher)
      .useClass(ControllableDialogueChangePublisher)
      .overrideProvider(DispatchDialogueTurnHandler)
      .useClass(ControllableDialogueDispatchHandler)
      .overrideProvider(DialogueExecution)
      .useClass(ControllableDialogueExecution)
      .overrideProvider(AgentSessionEventJournal)
      .useFactory({
        factory: (ingestion: DialogueEventIngestionApiService, reader: DialogueEventReader) =>
          new ObservedAgentSessionEventJournal(ingestion, reader, fake),
        inject: [DialogueEventIngestionApiService, DialogueEventReader],
      })
      .compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
  } catch (error) {
    await app?.close().catch(() => undefined);
    await fake.close().catch(() => undefined);
    await rm(workspace, { recursive: true, force: true });
    throw error;
  }
  if (app === undefined) {
    throw new Error('Dialogue scenario application did not start.');
  }
  const endpoint = new URL('/graphql', await app.getUrl()).toString();
  const prisma = app.get(PrismaService);

  return {
    app,
    agent: new DialogueScenarioAgent(fake, prisma),
    client: new DialogueScenarioClient(app, endpoint),
    execution: app.get<ControllableDialogueExecution>(DialogueExecution),
    journal: app.get(AgentSessionEventJournal),
    prisma,
    storage: new DialogueStorageProbe(prisma),
    changes: app.get<ControllableDialogueChangePublisher>(DialogueChangePublisher),
    dispatch: app.get<ControllableDialogueDispatchHandler>(DispatchDialogueTurnHandler),
    transactions: app.get<ControllableTransactionPrismaService>(TransactionPrismaService),
    recover: () => app.get(DialogueApiService).recover(),
    close: async () => {
      await fake.close();
      await app.close();
      await rm(workspace, { recursive: true, force: true });
    },
  };
};
