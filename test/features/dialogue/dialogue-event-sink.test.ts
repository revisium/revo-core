import { randomUUID } from 'node:crypto';

import type { AgentSessionEvent } from '@revisium/revo-agent-runtime';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  startDialogueScenario,
  type DialogueScenario,
} from '../../support/dialogue/dialogue-scenario.js';

const signal = new AbortController().signal;

const eventBase = (sessionId: string, sequence: number) => ({
  schemaVersion: 'agent-session-event/v1' as const,
  sessionId,
  streamId: `${sessionId}:stream`,
  sequence,
  eventId: `${sessionId}:${sequence}`,
  observedAt: '2026-09-06T00:00:00.000Z',
});

describe('Persistent agent session event sink', () => {
  let scenario: DialogueScenario;

  beforeAll(async () => {
    scenario = await startDialogueScenario();
  });

  afterAll(async () => {
    if (scenario !== undefined) {
      await scenario.close();
    }
  });

  test('creates a generic stream and deduplicates an identical event', async () => {
    const sessionId = `generic-${randomUUID()}`;
    const accepted: AgentSessionEvent = {
      ...eventBase(sessionId, 1),
      type: 'session.accepted',
      resumed: false,
      pin: {
        agentId: 'test-acp',
        agentVersion: '1.0.0',
        installationId: 'test-installation',
        definitionDigest: 'digest',
      },
    };

    await expect(
      scenario.journal.sink.append(accepted, { expected: { kind: 'empty' }, signal }),
    ).resolves.toEqual({ state: 'appended' });
    await expect(
      scenario.journal.sink.append(accepted, { expected: { kind: 'empty' }, signal }),
    ).resolves.toEqual({ state: 'appended' });
    const changed = {
      ...accepted,
      pin: {
        agentId: 'test-acp',
        agentVersion: '1.0.0',
        installationId: 'test-installation',
        definitionDigest: 'changed',
      },
    };
    await expect(
      scenario.journal.sink.append(changed, { expected: { kind: 'empty' }, signal }),
    ).resolves.toMatchObject({ state: 'conflict' });

    expect(await scenario.prisma.agentSessionEvent.count({ where: { sessionId } })).toBe(1);
  });

  test('validates and claims a hibernation token exactly once', async () => {
    const sessionId = `resume-${randomUUID()}`;
    const first: AgentSessionEvent = {
      ...eventBase(sessionId, 1),
      type: 'session.hibernated',
      resumeTokenId: `token-${randomUUID()}`,
      resumeTokenSha256: 'token-digest',
    };
    await expect(
      scenario.journal.sink.append(first, { expected: { kind: 'empty' }, signal }),
    ).resolves.toEqual({ state: 'appended' });
    const resumed: AgentSessionEvent = {
      ...eventBase(sessionId, 2),
      type: 'session.accepted',
      resumed: true,
      resumeTokenId: first.resumeTokenId,
      resumeTokenSha256: first.resumeTokenSha256,
      pin: {
        agentId: 'test-acp',
        agentVersion: '1.0.0',
        installationId: 'test-installation',
        definitionDigest: 'digest',
      },
    };
    const expected = {
      kind: 'hibernation_token' as const,
      cursor: { streamId: first.streamId, sequence: first.sequence, eventId: first.eventId },
      resumeTokenId: first.resumeTokenId,
      resumeTokenSha256: first.resumeTokenSha256,
    };
    await expect(scenario.journal.sink.append(resumed, { expected, signal })).resolves.toEqual({
      state: 'appended',
    });

    const otherSessionId = `resume-${randomUUID()}`;
    const otherFirst: AgentSessionEvent = {
      ...eventBase(otherSessionId, 1),
      type: 'session.hibernated',
      resumeTokenId: first.resumeTokenId,
      resumeTokenSha256: first.resumeTokenSha256,
    };
    await scenario.journal.sink.append(otherFirst, { expected: { kind: 'empty' }, signal });
    const otherResumed: AgentSessionEvent = {
      ...eventBase(otherSessionId, 2),
      type: 'session.accepted',
      resumed: true,
      resumeTokenId: first.resumeTokenId,
      resumeTokenSha256: first.resumeTokenSha256,
      pin: {
        agentId: 'test-acp',
        agentVersion: '1.0.0',
        installationId: 'test-installation',
        definitionDigest: 'digest',
      },
    };
    await expect(
      scenario.journal.sink.append(otherResumed, {
        expected: {
          ...expected,
          cursor: {
            streamId: otherFirst.streamId,
            sequence: otherFirst.sequence,
            eventId: otherFirst.eventId,
          },
        },
        signal,
      }),
    ).resolves.toMatchObject({ state: 'conflict' });
  });

  test('rejects forged resume predecessors, stale cursors, and aborted appends without writes', async () => {
    const sessionId = `negative-${randomUUID()}`;
    const tokenId = `token-${randomUUID()}`;
    const predecessor: AgentSessionEvent = {
      ...eventBase(sessionId, 1),
      type: 'session.hibernated',
      resumeTokenId: tokenId,
      resumeTokenSha256: 'stored-digest',
    };
    await scenario.journal.sink.append(predecessor, {
      expected: { kind: 'empty' },
      signal,
    });
    const resumed: AgentSessionEvent = {
      ...eventBase(sessionId, 2),
      type: 'session.accepted',
      resumed: true,
      resumeTokenId: tokenId,
      resumeTokenSha256: 'forged-digest',
      pin: {
        agentId: 'test-acp',
        agentVersion: '1.0.0',
        installationId: 'test-installation',
        definitionDigest: 'digest',
      },
    };
    await expect(
      scenario.journal.sink.append(resumed, {
        expected: {
          kind: 'hibernation_token',
          cursor: {
            streamId: predecessor.streamId,
            sequence: predecessor.sequence,
            eventId: predecessor.eventId,
          },
          resumeTokenId: tokenId,
          resumeTokenSha256: 'forged-digest',
        },
        signal,
      }),
    ).resolves.toMatchObject({ state: 'conflict' });

    const stale: AgentSessionEvent = {
      ...eventBase(sessionId, 2),
      eventId: `${sessionId}:stale`,
      type: 'turn.started',
      turnId: 'turn-stale',
    };
    await expect(
      scenario.journal.sink.append(stale, {
        expected: {
          kind: 'cursor',
          cursor: { streamId: predecessor.streamId, sequence: 0, eventId: 'missing' },
        },
        signal,
      }),
    ).resolves.toMatchObject({ state: 'conflict' });

    const switchedStream = {
      ...stale,
      streamId: `${sessionId}:unclaimed-stream`,
      eventId: `${sessionId}:unclaimed-switch`,
    };
    await expect(
      scenario.journal.sink.append(switchedStream, {
        expected: {
          kind: 'cursor',
          cursor: {
            streamId: predecessor.streamId,
            sequence: predecessor.sequence,
            eventId: predecessor.eventId,
          },
        },
        signal,
      }),
    ).resolves.toMatchObject({ state: 'conflict' });

    const aborted = new AbortController();
    aborted.abort(new Error('Test append aborted.'));
    await expect(
      scenario.journal.sink.append(stale, {
        expected: {
          kind: 'cursor',
          cursor: {
            streamId: predecessor.streamId,
            sequence: predecessor.sequence,
            eventId: predecessor.eventId,
          },
        },
        signal: aborted.signal,
      }),
    ).rejects.toThrow('Test append aborted.');
    expect(await scenario.prisma.agentSessionEvent.count({ where: { sessionId } })).toBe(1);
    expect(
      await scenario.prisma.agentSessionEvent.count({
        where: { claimedResumeTokenId: tokenId },
      }),
    ).toBe(0);

    const wrongTypeSessionId = `wrong-type-${randomUUID()}`;
    const wrongType = {
      ...eventBase(wrongTypeSessionId, 1),
      type: 'turn.started',
      turnId: 'turn-with-token-shaped-data',
      resumeTokenId: tokenId,
      resumeTokenSha256: 'stored-digest',
    } as unknown as AgentSessionEvent;
    await scenario.journal.sink.append(wrongType, { expected: { kind: 'empty' }, signal });
    const wrongTypeResume: AgentSessionEvent = {
      ...eventBase(wrongTypeSessionId, 2),
      type: 'session.accepted',
      resumed: true,
      resumeTokenId: tokenId,
      resumeTokenSha256: 'stored-digest',
      pin: {
        agentId: 'test-acp',
        agentVersion: '1.0.0',
        installationId: 'test-installation',
        definitionDigest: 'digest',
      },
    };
    await expect(
      scenario.journal.sink.append(wrongTypeResume, {
        expected: {
          kind: 'hibernation_token',
          cursor: {
            streamId: wrongType.streamId,
            sequence: wrongType.sequence,
            eventId: wrongType.eventId,
          },
          resumeTokenId: tokenId,
          resumeTokenSha256: 'stored-digest',
        },
        signal,
      }),
    ).resolves.toMatchObject({ state: 'conflict' });
  });

  test('replays committed generic events after an exact cursor', async () => {
    const sessionId = `replay-${randomUUID()}`;
    const first: AgentSessionEvent = {
      ...eventBase(sessionId, 1),
      type: 'turn.started',
      turnId: 'turn-one',
    };
    const second: AgentSessionEvent = {
      ...eventBase(sessionId, 2),
      type: 'session.closed',
      outcome: 'closed',
    };
    await scenario.journal.sink.append(first, { expected: { kind: 'empty' }, signal });
    await scenario.journal.sink.append(second, {
      expected: {
        kind: 'cursor',
        cursor: { streamId: first.streamId, sequence: first.sequence, eventId: first.eventId },
      },
      signal,
    });

    const subscription = scenario.journal.subscribe(sessionId, {
      streamId: first.streamId,
      sequence: first.sequence,
      eventId: first.eventId,
    });
    const iterator = subscription[Symbol.asyncIterator]();
    await expect(iterator.next()).resolves.toEqual({ done: false, value: second });
    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined });
  });

  test('moves from replay to live delivery and cancels pending reads independently', async () => {
    const sessionId = `live-${randomUUID()}`;
    const first: AgentSessionEvent = {
      ...eventBase(sessionId, 1),
      type: 'turn.started',
      turnId: 'turn-live',
    };
    await scenario.journal.sink.append(first, { expected: { kind: 'empty' }, signal });
    const cursor = {
      streamId: first.streamId,
      sequence: first.sequence,
      eventId: first.eventId,
    };
    const cancelled = scenario.journal.subscribe(sessionId, cursor)[Symbol.asyncIterator]();
    const cancelledRead = cancelled.next();
    await expect(cancelled.next()).rejects.toThrow('one outstanding next()');
    await cancelled.return?.();
    await expect(cancelledRead).resolves.toEqual({ done: true, value: undefined });

    const live = scenario.journal.subscribe(sessionId, cursor)[Symbol.asyncIterator]();
    const pending = live.next();
    const terminal: AgentSessionEvent = {
      ...eventBase(sessionId, 2),
      type: 'session.closed',
      outcome: 'closed',
    };
    await scenario.journal.sink.append(terminal, { expected: { kind: 'cursor', cursor }, signal });
    await expect(pending).resolves.toEqual({ done: false, value: terminal });
    await expect(live.next()).resolves.toEqual({ done: true, value: undefined });
  });

  test('replays a resumed stream after a hibernated cursor and rejects unknown sessions', async () => {
    const sessionId = `continued-${randomUUID()}`;
    const hibernated: AgentSessionEvent = {
      ...eventBase(sessionId, 1),
      type: 'session.hibernated',
      resumeTokenId: `token-${randomUUID()}`,
      resumeTokenSha256: 'digest',
    };
    await scenario.journal.sink.append(hibernated, { expected: { kind: 'empty' }, signal });
    const resumed: AgentSessionEvent = {
      ...eventBase(sessionId, 2),
      streamId: `${sessionId}:resumed-stream`,
      type: 'session.accepted',
      resumed: true,
      resumeTokenId: hibernated.resumeTokenId,
      resumeTokenSha256: hibernated.resumeTokenSha256,
      pin: {
        agentId: 'test-acp',
        agentVersion: '1.0.0',
        installationId: 'test-installation',
        definitionDigest: 'digest',
      },
    };
    await scenario.journal.sink.append(resumed, {
      expected: {
        kind: 'hibernation_token',
        cursor: {
          streamId: hibernated.streamId,
          sequence: hibernated.sequence,
          eventId: hibernated.eventId,
        },
        resumeTokenId: hibernated.resumeTokenId,
        resumeTokenSha256: hibernated.resumeTokenSha256,
      },
      signal,
    });
    const subscription = scenario.journal.subscribe(sessionId, {
      streamId: hibernated.streamId,
      sequence: hibernated.sequence,
      eventId: hibernated.eventId,
    });
    const iterator = subscription[Symbol.asyncIterator]();
    await expect(iterator.next()).resolves.toEqual({ done: false, value: resumed });
    await iterator.return?.();

    const unknown = scenario.journal.subscribe(`missing-${randomUUID()}`)[Symbol.asyncIterator]();
    await expect(unknown.next()).rejects.toThrow('Agent session event stream not found.');
  });
});
