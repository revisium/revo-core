import { AgentManagerError, type AgentFault } from '@revisium/revo-agent-runtime';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AgentSessionErrorCode } from '../../../src/infrastructure/agent-runtime/agent-session.errors.js';
import {
  createAgentSessionGraphqlApp,
  sessionCapabilities,
  sessionPin,
  sessionResumeToken,
} from '../../fixtures/agent-session-graphql.js';

describe('AgentSession lifecycle over GraphQL', () => {
  let fixture: Awaited<ReturnType<typeof createAgentSessionGraphqlApp>>;

  beforeEach(async () => {
    fixture = await createAgentSessionGraphqlApp();
  });

  afterEach(async () => {
    await fixture.app.close();
  });

  it('looks up the requested agent definition without returning a different version', async () => {
    fixture.sessions.listAgents.mockReturnValue([
      {
        agent: { id: 'test', version: '1' },
        definitionDigest: 'digest',
        displayName: 'Test agent',
        capabilities: {
          session: sessionCapabilities,
          cancellation: true,
          usage: true,
          structuredResult: true,
        },
      },
    ]);

    const response = await fixture.graphql(`
      {
        found: agentSessionAgent(agentId: "test", agentVersion: "1") {
          agent {
            id
            version
          }
        }
        missing: agentSessionAgent(agentId: "test", agentVersion: "2") {
          agent {
            id
            version
          }
        }
      }
    `);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data).toEqual({
      found: { agent: { id: 'test', version: '1' } },
      missing: null,
    });
  });

  it('returns the active session and the current turn identity', async () => {
    fixture.sessions.inspect.mockReturnValue({
      sessionId: 'dlg_test',
      pin: sessionPin,
      status: 'running',
      activeTurnId: 'trn_current',
      pendingInteractions: [],
      acceptedAt: '2026-01-01T00:00:00Z',
      outputDirectory: '/private/output',
    });

    const response = await fixture.graphql(`
      {
        agentSession(sessionId: "dlg_test") {
          sessionId
          status
          activeTurnId
        }
      }
    `);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.agentSession).toEqual({
      sessionId: 'dlg_test',
      status: 'running',
      activeTurnId: 'trn_current',
    });
    expect(fixture.sessions.inspect).toHaveBeenCalledWith('dlg_test');
  });

  it('returns null for an unknown session', async () => {
    const response = await fixture.graphql(`
      {
        agentSession(sessionId: "missing") {
          sessionId
        }
      }
    `);

    expect(response.body).toEqual({ data: { agentSession: null } });
  });

  it('exposes a closed session through both terminal reads', async () => {
    const terminal = {
      sessionId: 'dlg_test',
      pin: sessionPin,
      status: 'closed' as const,
      cleanup: 'confirmed' as const,
      acceptedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:01:00Z',
    };
    fixture.sessions.getTerminal.mockReturnValue(terminal);
    fixture.sessions.listTerminal.mockReturnValue([terminal]);

    const response = await fixture.graphql(`
      {
        terminalAgentSession(sessionId: "dlg_test") {
          sessionId
          status
          cleanup
        }
        terminalAgentSessions(first: 1) {
          totalCount
          edges {
            node {
              sessionId
              status
              cleanup
            }
          }
        }
      }
    `);

    expect(response.body.errors).toBeUndefined();
    const expected = { sessionId: 'dlg_test', status: 'closed', cleanup: 'confirmed' };
    expect(response.body.data).toEqual({
      terminalAgentSession: expected,
      terminalAgentSessions: { totalCount: 1, edges: [{ node: expected }] },
    });
  });

  it('inspects configuration in the session workspace with the configured launch context', async () => {
    fixture.manager.inspectConfiguration.mockResolvedValue({
      schemaVersion: 'agent-configuration-catalog/v1',
      agent: { id: 'test', version: '1' },
      definitionDigest: 'digest',
      catalogRevision: 'catalog_1',
      launch: { executable: 'test-cli', reportedVersion: '1' },
      options: [],
    });

    const response = await fixture.graphql(`
      {
        inspectAgentConfiguration(agentId: "test", agentVersion: "1") {
          catalogRevision
          options {
            __typename
          }
        }
      }
    `);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.inspectAgentConfiguration).toEqual({
      catalogRevision: 'catalog_1',
      options: [],
    });
    expect(fixture.manager.inspectConfiguration).toHaveBeenCalledExactlyOnceWith(
      { agent: { id: 'test', version: '1' }, workspace: { directory: '/test/workspace' } },
      fixture.launchContext,
    );
    expect(fixture.sessions.open).not.toHaveBeenCalled();
  });

  it('returns an observation checkpoint without treating it as a resume token', async () => {
    fixture.session.checkpoint.mockResolvedValue({
      schemaVersion: 'agent-session-checkpoint/v1',
      sessionId: 'dlg_test',
      checkpointId: 'checkpoint_test',
      eligibility: 'observation_only',
      pin: sessionPin,
      cursor: sessionResumeToken.cursor,
      payload: 'checkpoint-payload',
      sha256: 'digest',
    });

    const response = await fixture.graphql(`
      mutation {
        checkpointAgentSession(sessionId: "dlg_test") {
          checkpointId
          eligibility
          payload
        }
      }
    `);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.checkpointAgentSession).toEqual({
      checkpointId: 'checkpoint_test',
      eligibility: 'observation_only',
      payload: 'checkpoint-payload',
    });
    expect(fixture.session.hibernate).not.toHaveBeenCalled();
  });

  it('returns a native hibernation token', async () => {
    fixture.session.hibernate.mockResolvedValue({
      state: 'hibernated',
      resumeToken: sessionResumeToken,
    });

    const response = await fixture.graphql(`
      mutation {
        hibernateAgentSession(sessionId: "dlg_test") {
          state
          resumeToken {
            resumeTokenId
            eligibility
          }
        }
      }
    `);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.hibernateAgentSession).toEqual({
      state: 'hibernated',
      resumeToken: { resumeTokenId: 'resume_test', eligibility: 'hibernated' },
    });
  });

  it('resumes with the supplied token and model selection using a separate output identity', async () => {
    const response = await fixture.graphql(
      `
        mutation ($token: AgentSessionResumeTokenInput!) {
          resumeAgentSession(
            token: $token
            configuration: {selections: {model: "selected-model"}}
          ) {
            sessionId
            capabilities {
              resume
            }
          }
        }
      `,
      { token: sessionResumeToken },
    );

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.resumeAgentSession).toEqual({
      sessionId: 'dlg_test',
      capabilities: { resume: 'native' },
    });
    expect(fixture.directories.outputDirectory).toHaveBeenCalledExactlyOnceWith(
      'dlg_test',
      'resume_test',
    );
    expect(fixture.sessions.resume).toHaveBeenCalledExactlyOnceWith(
      {
        token: sessionResumeToken,
        configuration: { selections: { model: 'selected-model' } },
        workspace: { directory: '/test/workspace' },
        output: { directory: '/test/output' },
        parameters: {},
        permissions: {},
      },
      fixture.launchContext,
    );
  });

  it('closes an idle session without invoking cancellation', async () => {
    const response = await fixture.graphql(`
      mutation {
        closeAgentSession(sessionId: "dlg_test") {
          state
        }
      }
    `);

    expect(response.body).toEqual({ data: { closeAgentSession: { state: 'closed' } } });
    expect(fixture.session.close).toHaveBeenCalledOnce();
    expect(fixture.sessions.cancel).not.toHaveBeenCalled();
  });

  it('can request cancellation before the session handle is available', async () => {
    fixture.sessions.get.mockReturnValue(undefined);

    const response = await fixture.graphql(`
      mutation {
        cancelAgentSession(sessionId: "dlg_opening") {
          state
        }
      }
    `);

    expect(response.body).toEqual({ data: { cancelAgentSession: { state: 'requested' } } });
    expect(fixture.sessions.cancel).toHaveBeenCalledExactlyOnceWith(
      'dlg_opening',
      'revo_core_api_cancel',
    );
    expect(fixture.sessions.get).not.toHaveBeenCalled();
  });

  it.each([
    {
      operation: 'checkpoint',
      query: 'mutation { checkpointAgentSession(sessionId: "missing") { checkpointId } }',
    },
    {
      operation: 'hibernate',
      query: 'mutation { hibernateAgentSession(sessionId: "missing") { state } }',
    },
    { operation: 'close', query: 'mutation { closeAgentSession(sessionId: "missing") { state } }' },
    {
      operation: 'send',
      query:
        'mutation { sendAgentSessionMessage(sessionId: "missing", prompt: "hello") { __typename } }',
    },
    {
      operation: 'start turn',
      query: 'mutation { startAgentSessionTurn(sessionId: "missing", prompt: "hello") { turnId } }',
    },
  ])('returns NOT_FOUND for $operation on a missing session', async ({ query }) => {
    fixture.sessions.get.mockReturnValue(undefined);

    const response = await fixture.graphql(query);

    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].extensions).toMatchObject({
      code: AgentSessionErrorCode.notFound,
      statusCode: 404,
    });
    expect(fixture.session.send).not.toHaveBeenCalled();
  });

  it.each([
    {
      runtimeCode: 'revo.agent.session_busy',
      code: AgentSessionErrorCode.conflict,
      statusCode: 409,
    },
    {
      runtimeCode: 'revo.agent.session_unsupported',
      code: AgentSessionErrorCode.unsupported,
      statusCode: 422,
    },
    {
      runtimeCode: 'revo.agent.session_capacity',
      code: AgentSessionErrorCode.unavailable,
      statusCode: 503,
    },
  ] satisfies { runtimeCode: AgentFault['code']; code: string; statusCode: number }[])(
    'maps $runtimeCode to a structured transport error',
    async ({ runtimeCode, code, statusCode }) => {
      fixture.session.checkpoint.mockRejectedValue(
        new AgentManagerError({
          code: runtimeCode,
          phase: 'session_running',
          retryable: false,
          message: 'Operation rejected.',
        }),
      );

      const response = await fixture.graphql(`
        mutation {
          checkpointAgentSession(sessionId: "dlg_test") {
            checkpointId
          }
        }
      `);

      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].extensions).toMatchObject({
        code,
        statusCode,
        details: { runtimeCode, retryable: false },
      });
    },
  );
});
