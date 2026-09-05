import type { AgentSessionTurn, AgentSessionTurnResult } from '@revisium/revo-agent-runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentSessionErrorCode } from '../../../src/infrastructure/agent-runtime/agent-session.errors.js';
import { createAgentSessionGraphqlApp } from '../../fixtures/agent-session-graphql.js';

describe('AgentSession turn control over GraphQL', () => {
  let fixture: Awaited<ReturnType<typeof createAgentSessionGraphqlApp>>;

  beforeEach(async () => {
    fixture = await createAgentSessionGraphqlApp();
  });

  afterEach(async () => {
    await fixture.app.close();
  });

  it('starts without waiting, then exposes the same result to later wait and inspect requests', async () => {
    const completion = Promise.withResolvers<AgentSessionTurnResult>();
    fixture.session.send.mockImplementation(async ({ turnId }) => ({
      sessionId: 'dlg_test',
      turnId,
      result: () => completion.promise,
      cancel: async () => ({ state: 'requested' }),
    }));

    const started = await fixture.graphql(`
      mutation {
        startAgentSessionTurn(sessionId: "dlg_test", prompt: "hello") {
          sessionId
          turnId
        }
      }
    `);

    expect(started.body.errors).toBeUndefined();
    const turnId: string = started.body.data.startAgentSessionTurn.turnId;
    expect(turnId).toMatch(/^trn_/);
    expect(started.body.data.startAgentSessionTurn.sessionId).toBe('dlg_test');

    const running = await fixture.graphql(
      `
        query ($turnId: ID!) {
          agentSessionTurn(turnId: $turnId) {
            state
            result {
              __typename
            }
          }
        }
      `,
      { turnId },
    );

    expect(running.body).toEqual({
      data: { agentSessionTurn: { state: 'running', result: null } },
    });

    completion.resolve({
      status: 'completed',
      message: { role: 'assistant', content: 'hello back' },
    });
    const waitQuery = `
      mutation ($turnId: ID!) {
        waitForAgentSessionTurn(turnId: $turnId) {
          ... on AgentCompletedTurnModel {
            status
            message {
              content
            }
          }
        }
      }
    `;
    const firstWait = await fixture.graphql(waitQuery, { turnId });
    const secondWait = await fixture.graphql(waitQuery, { turnId });
    const completed = await fixture.graphql(
      `
        query ($turnId: ID!) {
          agentSessionTurn(turnId: $turnId) {
            state
            result {
              ... on AgentCompletedTurnModel {
                status
                message {
                  content
                }
              }
            }
          }
        }
      `,
      { turnId },
    );

    const expectedResult = { status: 'completed', message: { content: 'hello back' } };
    expect(firstWait.body).toEqual({ data: { waitForAgentSessionTurn: expectedResult } });
    expect(secondWait.body).toEqual(firstWait.body);
    expect(completed.body).toEqual({
      data: { agentSessionTurn: { state: 'completed', result: expectedResult } },
    });
    expect(fixture.session.send).toHaveBeenCalledExactlyOnceWith({ turnId, prompt: 'hello' });
  });

  it('targets the turn handle for cancellation and waits for confirmation before reporting completion', async () => {
    const completion = Promise.withResolvers<AgentSessionTurnResult>();
    const cancel = vi.fn<AgentSessionTurn['cancel']>().mockResolvedValue({ state: 'requested' });
    fixture.session.send.mockResolvedValue({
      sessionId: 'dlg_test',
      turnId: 'trn_cancel',
      result: () => completion.promise,
      cancel,
    });
    await fixture.graphql(`
      mutation {
        startAgentSessionTurn(sessionId: "dlg_test", prompt: "work") {
          turnId
        }
      }
    `);

    const cancellation = await fixture.graphql(`
      mutation {
        cancelAgentSessionTurn(turnId: "trn_cancel") {
          state
        }
      }
    `);
    const stillRunning = await fixture.graphql(`
      {
        agentSessionTurn(turnId: "trn_cancel") {
          state
        }
      }
    `);

    expect(cancellation.body).toEqual({ data: { cancelAgentSessionTurn: { state: 'requested' } } });
    expect(stillRunning.body).toEqual({ data: { agentSessionTurn: { state: 'running' } } });
    expect(cancel).toHaveBeenCalledExactlyOnceWith('revo_core_api_cancel_turn');
    expect(fixture.sessions.cancel).not.toHaveBeenCalled();

    completion.resolve({ status: 'cancelled' });
    const settled = await fixture.graphql(`
      mutation {
        waitForAgentSessionTurn(turnId: "trn_cancel") {
          __typename
          ... on AgentCancelledTurnModel {
            status
          }
        }
      }
    `);

    expect(settled.body).toEqual({
      data: {
        waitForAgentSessionTurn: { __typename: 'AgentCancelledTurnModel', status: 'cancelled' },
      },
    });
  });

  it('returns the completed result when cancelling an already completed turn', async () => {
    const result: AgentSessionTurnResult = {
      status: 'completed',
      message: { role: 'assistant', content: 'done' },
    };
    fixture.session.send.mockResolvedValue({
      sessionId: 'dlg_test',
      turnId: 'trn_done',
      result: async () => result,
      cancel: async () => ({ state: 'already_completed', result }),
    });
    await fixture.graphql(`
      mutation {
        sendAgentSessionMessage(sessionId: "dlg_test", prompt: "work") {
          __typename
        }
      }
    `);

    const response = await fixture.graphql(`
      mutation {
        cancelAgentSessionTurn(turnId: "trn_done") {
          state
          result {
            ... on AgentCompletedTurnModel {
              message {
                content
              }
            }
          }
        }
      }
    `);

    expect(response.body).toEqual({
      data: {
        cancelAgentSessionTurn: {
          state: 'already_completed',
          result: { message: { content: 'done' } },
        },
      },
    });
  });

  it('returns null for an unknown turn without fabricating a running state', async () => {
    const response = await fixture.graphql(`
      {
        agentSessionTurn(turnId: "missing") {
          state
        }
      }
    `);

    expect(response.body).toEqual({ data: { agentSessionTurn: null } });
  });

  it('returns NOT_FOUND when cancelling an unknown turn', async () => {
    const response = await fixture.graphql(`
      mutation {
        cancelAgentSessionTurn(turnId: "missing") {
          state
        }
      }
    `);

    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].extensions).toMatchObject({
      code: AgentSessionErrorCode.notFound,
      statusCode: 404,
    });
    expect(fixture.sessions.cancel).not.toHaveBeenCalled();
  });

  it('normalizes a rejected result for both wait and inspect without leaking the raw exception', async () => {
    const completion = Promise.withResolvers<AgentSessionTurnResult>();
    fixture.session.send.mockResolvedValue({
      sessionId: 'dlg_test',
      turnId: 'trn_failed',
      result: () => completion.promise,
      cancel: async () => ({ state: 'requested' }),
    });
    await fixture.graphql(`
      mutation {
        startAgentSessionTurn(sessionId: "dlg_test", prompt: "work") {
          turnId
        }
      }
    `);
    completion.reject(new Error('Private provider diagnostic.'));

    const waited = await fixture.graphql(`
      mutation {
        waitForAgentSessionTurn(turnId: "trn_failed") {
          __typename
        }
      }
    `);
    const inspected = await fixture.graphql(`
      {
        agentSessionTurn(turnId: "trn_failed") {
          state
        }
      }
    `);

    for (const response of [waited, inspected]) {
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0]).toMatchObject({
        message: 'Agent session operation failed.',
        extensions: { code: AgentSessionErrorCode.internal, statusCode: 500 },
      });
      expect(JSON.stringify(response.body)).not.toContain('Private provider diagnostic');
    }
  });

  it.each([
    { result: { status: 'timed_out' }, model: 'AgentTimedOutTurnModel' },
    { result: { status: 'interrupted' }, model: 'AgentInterruptedTurnModel' },
    {
      result: {
        status: 'failed',
        error: {
          code: 'revo.agent.internal',
          phase: 'session_running',
          retryable: false,
          message: 'Provider failed.',
        },
      },
      model: 'AgentFailedTurnModel',
    },
  ] satisfies { result: AgentSessionTurnResult; model: string }[])(
    'preserves the $result.status outcome as $model',
    async ({ result, model }) => {
      fixture.session.send.mockResolvedValue({
        sessionId: 'dlg_test',
        turnId: 'trn_outcome',
        result: async () => result,
        cancel: async () => ({ state: 'already_completed', result }),
      });

      const response = await fixture.graphql(`
        mutation {
          sendAgentSessionMessage(sessionId: "dlg_test", prompt: "work") {
            __typename
          }
        }
      `);

      expect(response.body).toEqual({ data: { sendAgentSessionMessage: { __typename: model } } });
    },
  );
});
