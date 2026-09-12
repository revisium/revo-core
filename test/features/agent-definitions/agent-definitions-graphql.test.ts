import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAgentDefinitionsGraphqlApp } from '../../fixtures/agent-definitions-graphql.js';

describe('Agent definitions over GraphQL', () => {
  let fixture: Awaited<ReturnType<typeof createAgentDefinitionsGraphqlApp>>;

  beforeEach(async () => {
    fixture = await createAgentDefinitionsGraphqlApp();
  });

  afterEach(async () => {
    await fixture.app.close();
    vi.restoreAllMocks();
  });

  it('lists and gets agent definitions through the feature API', async () => {
    fixture.sessions.listAgents.mockReturnValue([
      {
        agent: { id: 'test', version: '1' },
        definitionDigest: 'digest',
        displayName: 'Test agent',
        capabilities: {
          session: {
            multiTurn: true,
            resume: 'native',
            interactions: { permission: true, input: true },
            updates: { message: true, tool: true, usage: true, plan: true, progress: true },
          },
          cancellation: true,
          usage: true,
          structuredResult: true,
        },
      },
    ]);

    const response = await fixture.graphql(`
      {
        agentDefinitions(first: 1) {
          totalCount
          edges {
            node {
              agent { id version }
              capabilities { session { multiTurn } }
            }
          }
        }
        found: agentDefinition(agentId: "test", agentVersion: "1") {
          agent { id version }
        }
        missing: agentDefinition(agentId: "test", agentVersion: "2") {
          agent { id version }
        }
      }
    `);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data).toEqual({
      agentDefinitions: {
        totalCount: 1,
        edges: [
          {
            node: {
              agent: { id: 'test', version: '1' },
              capabilities: { session: { multiTurn: true } },
            },
          },
        ],
      },
      found: { agent: { id: 'test', version: '1' } },
      missing: null,
    });
  });

  it('treats explicit null pagination arguments as omitted', async () => {
    const response = await fixture.graphql(
      `
        query AgentDefinitions($first: Int, $after: String) {
          agentDefinitions(first: $first, after: $after) { totalCount }
        }
      `,
      { first: null, after: null },
    );

    expect(response.body).toEqual({ data: { agentDefinitions: { totalCount: 1 } } });
  });

  it('does not expose the removed session API', async () => {
    const response = await fixture.graphql(`
      {
        schema: __schema {
          queryType { fields { name } }
          mutationType { fields { name } }
          subscriptionType { fields { name } }
        }
      }
    `);

    expect(response.body.errors).toBeUndefined();
    const queryFields = response.body.data.schema.queryType.fields.map(
      ({ name }: { readonly name: string }) => name,
    );
    const mutationFields = (response.body.data.schema.mutationType?.fields ?? []).map(
      ({ name }: { readonly name: string }) => name,
    );
    const subscriptionFields = (response.body.data.schema.subscriptionType?.fields ?? []).map(
      ({ name }: { readonly name: string }) => name,
    );

    expect(queryFields).not.toEqual(
      expect.arrayContaining([
        'activeAgentSessions',
        'terminalAgentSession',
        'terminalAgentSessions',
        'agentSessionTurn',
        'agentSession',
      ]),
    );
    expect(queryFields).not.toContain('inspectAgentConfiguration');
    expect(mutationFields).not.toEqual(
      expect.arrayContaining([
        'openAgentSession',
        'sendAgentSessionMessage',
        'startAgentSessionTurn',
        'waitForAgentSessionTurn',
        'cancelAgentSessionTurn',
        'checkpointAgentSession',
        'hibernateAgentSession',
        'resumeAgentSession',
        'respondAgentSession',
        'cancelAgentSession',
        'closeAgentSession',
      ]),
    );
    expect(subscriptionFields).not.toContain('agentSessionEvents');
  });

  it('returns a public error for an invalid pagination cursor', async () => {
    const response = await fixture.graphql(`
      { agentDefinitions(after: "???") { totalCount } }
    `);

    expect(response.body).toMatchObject({
      data: null,
      errors: [
        {
          message: 'Agent definition cursor is invalid.',
          path: ['agentDefinitions'],
          extensions: {
            statusCode: 400,
            code: 'REVO_AGENT_SESSION_INVALID_CURSOR',
            path: null,
          },
        },
      ],
    });
  });

  it('returns a not-found error for an expired pagination cursor', async () => {
    const expiredCursor = Buffer.from(
      JSON.stringify({
        version: 1,
        epoch: 'expired',
        kind: 'agent-definitions',
        definitionId: '["test","1"]',
      }),
      'utf8',
    ).toString('base64url');
    const response = await fixture.graphql(
      `{ agentDefinitions(after: "${expiredCursor}") { totalCount } }`,
    );

    expect(response.body).toMatchObject({
      data: null,
      errors: [
        {
          message: 'Agent definition cursor belongs to an earlier process.',
          path: ['agentDefinitions'],
          extensions: {
            statusCode: 404,
            code: 'REVO_AGENT_SESSION_EXPIRED_CURSOR',
            path: null,
          },
        },
      ],
    });
  });
});
