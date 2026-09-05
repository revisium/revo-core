import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import type { INestApplication } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import type { AgentSession, AgentSessions, AgentSessionTurn } from '@revisium/revo-agent-runtime';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentSessionResolver } from '../../../src/api/graphql/agent-session/agent-session.resolver.js';
import { AgentSessionModule } from '../../../src/features/agent-session/agent-session.module.js';
import {
  AGENT_MANAGER,
  AGENT_DEFINITIONS,
} from '../../../src/infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../../src/infrastructure/agent-runtime/agent-session-directories.js';
import { AgentSessionErrorCode } from '../../../src/infrastructure/agent-runtime/agent-session.errors.js';

const pin = { agentId: 'test', agentVersion: '1', definitionDigest: 'digest' };
const capabilities: AgentSession['capabilities'] = {
  multiTurn: true,
  resume: 'none',
  interactions: { permission: true, input: true },
  updates: { message: true, tool: true, usage: true, plan: true, progress: false },
};
const completedTurn: AgentSessionTurn = {
  sessionId: 'dlg_test',
  turnId: 'trn_test',
  result: async () => ({
    status: 'completed',
    message: { role: 'assistant', content: 'hello' },
    usage: { scope: 'session_cumulative', inputTokens: 1, outputTokens: 1, totalTokens: 2 },
  }),
  cancel: async () => ({ state: 'already_completed', result: await completedTurn.result() }),
};
const session: AgentSession = {
  sessionId: 'dlg_test',
  pin,
  capabilities,
  send: vi.fn<AgentSession['send']>().mockResolvedValue(completedTurn),
  respond: vi.fn<AgentSession['respond']>(),
  checkpoint: vi.fn<AgentSession['checkpoint']>(),
  hibernate: vi.fn<AgentSession['hibernate']>(),
  cancel: vi.fn<AgentSession['cancel']>(),
  close: vi.fn<AgentSession['close']>().mockResolvedValue({ state: 'closed' }),
};
const manager = {
  sessions: {
    listAgents: () => [
      {
        agent: { id: 'test', version: '1' },
        definitionDigest: 'digest',
        displayName: 'Test',
        capabilities: {
          session: capabilities,
          cancellation: true,
          usage: true,
          structuredResult: true,
        },
      },
    ],
    list: () => [
      {
        sessionId: 'dlg_test',
        pin,
        capabilities,
        status: 'idle',
        pendingInteractions: [],
        acceptedAt: '2026-01-01T00:00:00Z',
        outputDirectory: '/private/output',
      },
    ],
    open: vi.fn<AgentSessions['open']>().mockResolvedValue(session),
    get: () => session,
    respond: vi.fn<AgentSessions['respond']>().mockResolvedValue({ state: 'accepted' }),
  },
};

describe('AgentSession GraphQL application contract', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        AgentSessionModule,
        GraphQLModule.forRoot<YogaDriverConfig>({
          driver: YogaDriver,
          autoSchemaFile: true,
          sortSchema: true,
        }),
      ],
      providers: [AgentSessionResolver],
    })
      .overrideProvider(AGENT_MANAGER)
      .useValue(manager)
      .overrideProvider(AGENT_DEFINITIONS)
      .useValue([])
      .overrideProvider(AgentSessionDirectories)
      .useValue({
        workspaceDirectory: '/test/workspace',
        outputDirectory: () => '/test/output',
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns typed agent/session connections through CQRS', async () => {
    const result = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          {
            agentSessionAgents(first: 1) {
              totalCount
              edges {
                cursor
                node {
                  agent {
                    id
                    version
                  }
                  capabilities {
                    session {
                      multiTurn
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
              }
            }
            activeAgentSessions(first: 1) {
              edges {
                node {
                  sessionId
                  status
                  pendingInteractions {
                    state
                  }
                }
              }
              totalCount
            }
          }
        `,
      });
    expect(result.body.errors).toBeUndefined();
    expect(result.body.data).toMatchObject({
      agentSessionAgents: {
        totalCount: 1,
        edges: [{ node: { agent: { id: 'test', version: '1' } } }],
      },
      activeAgentSessions: {
        totalCount: 1,
        edges: [{ node: { sessionId: 'dlg_test', status: 'idle' } }],
      },
    });
  });
  it('returns the identity of an opened session', async () => {
    const opened = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            openAgentSession(agentId: "test", agentVersion: "1") {
              sessionId
              capabilities {
                resume
              }
            }
          }
        `,
      });
    expect(opened.body).toMatchObject({ data: { openAgentSession: { sessionId: 'dlg_test' } } });
  });

  it('passes the selected model and catalog revision when opening a session', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            openAgentSession(
              agentId: "test"
              agentVersion: "1"
              configuration: {
                catalogRevision: "revision"
                selections: { model: "selected-model" }
              }
            ) {
              sessionId
            }
          }
        `,
      });

    expect(response.body.errors).toBeUndefined();
    expect(manager.sessions.open).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        agent: { id: 'test', version: '1' },
        configuration: { catalogRevision: 'revision', selections: { model: 'selected-model' } },
      }),
      expect.objectContaining({ environment: expect.any(Object) }),
    );
  });

  it('returns a completed message as a typed turn result', async () => {
    const sent = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            sendAgentSessionMessage(sessionId: "dlg_test", prompt: "hello") {
              __typename
              ... on AgentCompletedTurnModel {
                status
                message {
                  content
                }
                usage {
                  totalTokens
                }
              }
            }
          }
        `,
      });
    expect(sent.body.errors).toBeUndefined();
    expect(sent.body.data.sendAgentSessionMessage).toEqual({
      __typename: 'AgentCompletedTurnModel',
      status: 'completed',
      message: { content: 'hello' },
      usage: { totalTokens: 2 },
    });
  });

  it('does not expose the runtime output directory in the session schema', async () => {
    const fields = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          {
            sessionType: __type(name: "AgentSessionSnapshotModel") {
              fields {
                name
              }
            }
          }
        `,
      });
    expect(fields.body.errors).toBeUndefined();
    expect(fields.body.data.sessionType.fields).toEqual(
      expect.arrayContaining([{ name: 'sessionId' }]),
    );
    expect(fields.body.data.sessionType.fields).not.toContainEqual({ name: 'outputDirectory' });
  });
  it('rejects an input outcome for a permission request before calling the runtime', async () => {
    const invalid = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            respondAgentSession(
              sessionId: "dlg_test"
              data: {requestId: "r", kind: "permission", outcome: "submitted"}
            ) {
              state
            }
          }
        `,
      });
    expect(invalid.body.errors).toEqual([
      expect.objectContaining({
        extensions: expect.objectContaining({
          code: AgentSessionErrorCode.invalidInput,
          statusCode: 400,
        }),
      }),
    ]);
    expect(manager.sessions.respond).not.toHaveBeenCalled();
  });

  it.each(['text', 42, true, ['choice']])(
    'rejects non-object interaction values %j',
    async (values) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
          mutation($values: JSON!) {
            respondAgentSession(
              sessionId: "dlg_test"
              data: {
                requestId: "r"
                kind: "input"
                outcome: "submitted"
                values: $values
              }
            ) {
              state
            }
          }
        `,
          variables: { values },
        });

      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].extensions).toMatchObject({
        code: AgentSessionErrorCode.invalidInput,
        statusCode: 400,
      });
      expect(manager.sessions.respond).not.toHaveBeenCalled();
    },
  );

  it('forwards a selected permission option to the runtime', async () => {
    const valid = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            respondAgentSession(
              sessionId: "dlg_test"
              data: {requestId: "r", kind: "permission", outcome: "selected", optionId: "yes"}
            ) {
              state
            }
          }
        `,
      });
    expect(valid.body).toMatchObject({ data: { respondAgentSession: { state: 'accepted' } } });
    expect(manager.sessions.respond).toHaveBeenCalledWith('dlg_test', {
      requestId: 'r',
      response: { kind: 'permission', outcome: 'selected', optionId: 'yes' },
    });
  });
  it('returns INVALID_INPUT when the requested page size is zero', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          {
            activeAgentSessions(first: 0) {
              totalCount
            }
          }
        `,
      });

    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].extensions).toMatchObject({
      code: AgentSessionErrorCode.invalidInput,
      statusCode: 400,
    });
  });

  it('returns NOT_FOUND when waiting for an unknown turn', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            waitForAgentSessionTurn(turnId: "unknown") {
              __typename
            }
          }
        `,
      });

    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].extensions).toMatchObject({
      code: AgentSessionErrorCode.notFound,
      statusCode: 404,
    });
  });
});
