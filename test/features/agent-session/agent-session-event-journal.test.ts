import type { AgentSessionEvent } from '@revisium/revo-agent-runtime';
import { describe, expect, it } from 'vitest';

import { AgentSessionEventJournal } from '../../../src/infrastructure/agent-runtime/agent-session-event-journal.js';

const signal = new AbortController().signal;

const event = (
  sessionId: string,
  sequence: number,
  type: 'turn.started' | 'session.closed',
): AgentSessionEvent => {
  const base = {
    schemaVersion: 'agent-session-event/v1' as const,
    sessionId,
    streamId: `${sessionId}:stream`,
    sequence,
    eventId: `${sessionId}:${sequence}`,
    observedAt: '2026-01-01T00:00:00.000Z',
  };

  if (type === 'turn.started') {
    return { ...base, type, turnId: `turn-${sequence}` };
  }

  return {
    ...base,
    type,
    outcome: 'closed',
  };
};

describe('AgentSessionEventJournal', () => {
  it('expires retained history and disconnects a slow subscriber within bounded memory', async () => {
    const journal = new AgentSessionEventJournal();
    const first = event('bounded', 1, 'turn.started');
    await journal.sink.append(first, { expected: { kind: 'empty' }, signal });
    const slow = journal.subscribe('bounded')[Symbol.asyncIterator]();
    for (let sequence = 2; sequence <= 10_002; sequence += 1) {
      // Each append must observe its predecessor's cursor.
      // eslint-disable-next-line no-await-in-loop
      await journal.sink.append(event('bounded', sequence, 'turn.started'), {
        expected: {
          kind: 'cursor',
          cursor: {
            streamId: first.streamId,
            sequence: sequence - 1,
            eventId: `bounded:${sequence - 1}`,
          },
        },
        signal,
      });
    }
    expect(() =>
      journal.subscribe('bounded', {
        streamId: first.streamId,
        sequence: 1,
        eventId: first.eventId,
      }),
    ).toThrow('expired');
    await expect(slow.next()).rejects.toThrow('fell behind');
    const retained = journal.subscribe('bounded')[Symbol.asyncIterator]();
    await expect(retained.next()).resolves.toMatchObject({ value: { sequence: 3 } });
    await retained.return?.();
  });

  it('rejects a globally consumed token even after its terminal journal is evicted', async () => {
    const journal = new AgentSessionEventJournal();
    const first = event('original', 1, 'turn.started');
    await journal.sink.append(first, { expected: { kind: 'empty' }, signal });
    await journal.sink.append(event('original', 2, 'session.closed'), {
      expected: {
        kind: 'hibernation_token',
        cursor: { streamId: first.streamId, sequence: 1, eventId: first.eventId },
        resumeTokenId: 'one-use',
        resumeTokenSha256: 'digest',
      },
      signal,
    });
    for (let index = 0; index < 101; index += 1) {
      // Ordered terminal inserts exercise eviction deterministically.
      // eslint-disable-next-line no-await-in-loop
      await journal.sink.append(event(`terminal${index}`, 1, 'session.closed'), {
        expected: { kind: 'empty' },
        signal,
      });
    }
    const other = event('other', 1, 'turn.started');
    await journal.sink.append(other, { expected: { kind: 'empty' }, signal });
    await expect(
      journal.sink.append(event('other', 2, 'turn.started'), {
        expected: {
          kind: 'hibernation_token',
          cursor: { streamId: other.streamId, sequence: 1, eventId: other.eventId },
          resumeTokenId: 'one-use',
          resumeTokenSha256: 'different-digest',
        },
        signal,
      }),
    ).resolves.toMatchObject({ state: 'conflict' });
  });

  it('keeps resumed subscribers when an older terminal iterator is returned', async () => {
    const journal = new AgentSessionEventJournal();
    await journal.sink.append(event('resumed', 1, 'session.closed'), {
      expected: { kind: 'empty' },
      signal,
    });
    const old = journal.subscribe('resumed')[Symbol.asyncIterator]();
    const resumed: AgentSessionEvent = {
      ...event('resumed', 2, 'turn.started'),
      type: 'session.accepted',
      resumed: true,
      resumeTokenId: 'resume',
      resumeTokenSha256: 'digest',
      pin: { agentId: 'agent', agentVersion: '1', definitionDigest: 'digest' },
    };
    await journal.sink.append(resumed, {
      expected: {
        kind: 'cursor',
        cursor: { streamId: 'resumed:stream', sequence: 1, eventId: 'resumed:1' },
      },
      signal,
    });
    const stream = journal.subscribe('resumed', {
      streamId: 'resumed:stream',
      sequence: 2,
      eventId: 'resumed:2',
    });
    const current = stream[Symbol.asyncIterator]();
    const pending = current.next();
    await old.return?.();
    await journal.sink.append(event('resumed', 3, 'session.closed'), {
      expected: {
        kind: 'cursor',
        cursor: { streamId: 'resumed:stream', sequence: 2, eventId: 'resumed:2' },
      },
      signal,
    });
    await expect(pending).resolves.toMatchObject({ value: { sequence: 3 } });
    await expect(current.next()).resolves.toMatchObject({ done: true });
  });
  it('replays after a cursor and then follows live events', async () => {
    const journal = new AgentSessionEventJournal();
    const first = event('dlg_a', 1, 'turn.started');
    const second = event('dlg_a', 2, 'turn.started');
    await journal.sink.append(first, { expected: { kind: 'empty' }, signal });
    await journal.sink.append(second, {
      expected: {
        kind: 'cursor',
        cursor: { streamId: first.streamId, sequence: first.sequence, eventId: first.eventId },
      },
      signal,
    });

    const events = journal.subscribe('dlg_a', {
      streamId: first.streamId,
      sequence: first.sequence,
      eventId: first.eventId,
    });
    const iterator = events[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchObject({ value: second, done: false });
    const pending = iterator.next();
    const terminal = event('dlg_a', 3, 'session.closed');
    await journal.sink.append(terminal, {
      expected: {
        kind: 'cursor',
        cursor: { streamId: second.streamId, sequence: second.sequence, eventId: second.eventId },
      },
      signal,
    });
    await expect(pending).resolves.toMatchObject({ value: terminal, done: false });
    await expect(iterator.next()).resolves.toEqual({ value: undefined, done: true });
  });

  it('rejects concurrent next calls and an old iterator cannot remove a replacement subscriber', async () => {
    const journal = new AgentSessionEventJournal();
    await journal.sink.append(event('dlg_b', 1, 'turn.started'), {
      expected: { kind: 'empty' },
      signal,
    });
    const oldIterator = journal.subscribe('dlg_b')[Symbol.asyncIterator]();
    await oldIterator.next();
    const pending = oldIterator.next();
    await expect(oldIterator.next()).rejects.toThrow('one outstanding next()');
    await oldIterator.return?.();
    await expect(pending).resolves.toEqual({ value: undefined, done: true });

    const replacement = journal.subscribe('dlg_b')[Symbol.asyncIterator]();
    await replacement.next();
    const replacementPending = replacement.next();
    await journal.sink.append(event('dlg_b', 2, 'turn.started'), {
      expected: {
        kind: 'cursor',
        cursor: { streamId: 'dlg_b:stream', sequence: 1, eventId: 'dlg_b:1' },
      },
      signal,
    });
    await expect(replacementPending).resolves.toMatchObject({ done: false });
  });
});
