import type { AgentSessionEvent, AgentSessionEventCursor } from '@revisium/revo-agent-runtime';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
/* oxlint-disable no-await-in-loop -- Stress append and replay verify every ordered event. */

import {
  startDialogueScenario,
  type DialogueScenario,
} from '../../support/dialogue/dialogue-scenario.js';

const eventCount = process.env.REVO_DIALOGUE_STRESS === '1' ? 10_050 : 101;

describe('Persistent dialogue volume', () => {
  let scenario: DialogueScenario;
  const appendAbort = new AbortController();

  beforeAll(async () => {
    scenario = await startDialogueScenario();
  });

  afterAll(async () => {
    appendAbort.abort(new Error('Volume scenario cleanup.'));
    if (scenario !== undefined) {
      await scenario.close();
    }
  }, 30_000);

  test('replays across batch boundaries without storing growing text in the feed', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'High volume replay' });
    const turn = await scenario.client.send(dialogue.id, 'Produce a large event stream');
    await scenario.agent.expectTurn(turn);
    const storedTurn = await scenario.prisma.dialogueTurn.findUniqueOrThrow({
      where: { id: turn.id },
    });
    if (storedTurn.runtimeSessionId === null) {
      throw new Error('Volume turn has no runtime session.');
    }
    const sessionId = storedTurn.runtimeSessionId;
    const initialHead = await scenario.prisma.agentSessionEventStream.findUniqueOrThrow({
      where: { sessionId },
    });
    if (initialHead.streamId === null || initialHead.eventId === null) {
      throw new Error('Volume stream has no committed head.');
    }
    const historySnapshot = await scenario.client.historyPage(dialogue.id);
    const replaySubscription = scenario.journal.subscribe(sessionId, {
      streamId: initialHead.streamId,
      sequence: initialHead.sequence,
      eventId: initialHead.eventId,
    });
    const replay = replaySubscription[Symbol.asyncIterator]();
    let cursor: AgentSessionEventCursor = {
      streamId: initialHead.streamId,
      sequence: initialHead.sequence,
      eventId: initialHead.eventId,
    };
    const appendStartedAt = performance.now();
    for (let index = 0; index < eventCount; index += 1) {
      const event: AgentSessionEvent = {
        schemaVersion: 'agent-session-event/v1',
        sessionId,
        streamId: cursor.streamId,
        sequence: cursor.sequence + 1,
        eventId: crypto.randomUUID(),
        observedAt: new Date().toISOString(),
        type: 'assistant.message.delta',
        turnId: turn.id,
        content: 'x',
      };
      const result = await scenario.journal.sink.append(event, {
        expected: { kind: 'cursor', cursor },
        signal: appendAbort.signal,
      });
      if (result.state !== 'appended') {
        throw new Error(`Volume append conflicted at event ${index}.`);
      }
      cursor = {
        streamId: event.streamId,
        sequence: event.sequence,
        eventId: event.eventId,
      };
      if ((index + 1) % 1_000 === 0) {
        process.stdout.write(`VOLUME_APPEND_PROGRESS committed=${index + 1}\n`);
      }
    }
    const appendMilliseconds = Math.round(performance.now() - appendStartedAt);
    process.stdout.write(`VOLUME_APPEND_COMPLETE milliseconds=${appendMilliseconds}\n`);

    const replayStartedAt = performance.now();
    for (let index = 0; index < eventCount; index += 1) {
      const next = await replay.next();
      if (next.done || next.value.type !== 'assistant.message.delta') {
        throw new Error(`Volume replay stopped at event ${index}.`);
      }
      if (next.value.sequence !== initialHead.sequence + index + 1 || next.value.content !== 'x') {
        throw new Error(`Volume replay diverged at event ${index}.`);
      }
    }
    await replay.return?.();
    const replayMilliseconds = Math.round(performance.now() - replayStartedAt);
    process.stdout.write(`VOLUME_JOURNAL_REPLAY_COMPLETE milliseconds=${replayMilliseconds}\n`);

    const changeStream = await scenario.client.subscribe(
      dialogue.id,
      historySnapshot.snapshotCursor,
    );
    const sseStartedAt = performance.now();
    for (let index = 0; index < eventCount; index += 1) {
      const change = await changeStream.next();
      if (
        change.kind !== 'HISTORY_TEXT_APPENDED' ||
        change.textDelta !== 'x' ||
        change.baseItemVersion !== String(index) ||
        change.itemVersion !== String(index + 1)
      ) {
        throw new Error(`GraphQL SSE replay diverged at event ${index}.`);
      }
    }
    await changeStream.close();
    const sseMilliseconds = Math.round(performance.now() - sseStartedAt);
    process.stdout.write(`VOLUME_GRAPHQL_SSE_REPLAY_COMPLETE milliseconds=${sseMilliseconds}\n`);

    const [rawCount, feedCount, assistantItems, rawSize, feedSize] = await Promise.all([
      scenario.prisma.agentSessionEvent.count({
        where: { sessionId, sequence: { gt: initialHead.sequence } },
      }),
      scenario.prisma.dialogueChange.count({
        where: { dialogueId: dialogue.id, kind: 'HISTORY_TEXT_APPENDED' },
      }),
      scenario.prisma.dialogueHistoryItem.findMany({
        where: { dialogueId: dialogue.id, source: 'AGENT', kind: 'MESSAGE' },
      }),
      scenario.prisma.$queryRaw<readonly { readonly bytes: bigint }[]>`
        SELECT COALESCE(SUM(pg_column_size(payload)), 0)::bigint AS bytes
        FROM public.agent_session_events
        WHERE "sessionId" = ${sessionId} AND sequence > ${initialHead.sequence}
      `,
      scenario.prisma.$queryRaw<readonly { readonly bytes: bigint }[]>`
        SELECT COALESCE(SUM(pg_column_size(change_row)), 0)::bigint AS bytes
        FROM public.dialogue_changes AS change_row
        WHERE "dialogueId" = ${dialogue.id} AND kind = 'HISTORY_TEXT_APPENDED'
      `,
    ]);
    const assistantItem = assistantItems[0];
    const rawBytes = rawSize[0]?.bytes;
    const feedBytes = feedSize[0]?.bytes;
    if (assistantItem === undefined || rawBytes === undefined || feedBytes === undefined) {
      throw new Error('Volume measurements are incomplete.');
    }

    expect(rawCount).toBe(eventCount);
    expect(feedCount).toBe(eventCount);
    expect(assistantItems).toHaveLength(1);
    expect(assistantItem.text).toHaveLength(eventCount);
    expect(assistantItem.version).toBe(BigInt(eventCount));
    expect(
      await scenario.prisma.dialogueChange.count({
        where: {
          dialogueId: dialogue.id,
          kind: 'HISTORY_TEXT_APPENDED',
          textDelta: { not: 'x' },
        },
      }),
    ).toBe(0);
    process.stdout.write(
      `VOLUME_METRICS events=${eventCount} rawBytes=${rawBytes} feedBytes=${feedBytes} ` +
        `textBytes=${Buffer.byteLength(assistantItem.text, 'utf8')} ` +
        `appendMs=${appendMilliseconds} replayMs=${replayMilliseconds} sseMs=${sseMilliseconds}\n`,
    );
  }, 300_000);
});
