import { createHash } from 'node:crypto';

import type { AgentSessionEvent } from '@revisium/revo-agent-runtime';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  startDialogueScenario,
  type DialogueScenario,
} from '../../support/dialogue/dialogue-scenario.js';

interface EventBase {
  readonly schemaVersion: 'agent-session-event/v1';
  readonly sessionId: string;
  readonly streamId: string;
  readonly sequence: number;
  readonly eventId: string;
  readonly observedAt: string;
}

const appendCurrent = async (
  scenario: DialogueScenario,
  sessionId: string,
  create: (base: EventBase) => AgentSessionEvent,
): Promise<AgentSessionEvent> => {
  const head = await scenario.prisma.agentSessionEventStream.findUniqueOrThrow({
    where: { sessionId },
  });
  if (head.streamId === null || head.eventId === null) {
    throw new Error('Runtime stream has no committed head.');
  }
  const event = create({
    schemaVersion: 'agent-session-event/v1',
    sessionId,
    streamId: head.streamId,
    sequence: head.sequence + 1,
    eventId: crypto.randomUUID(),
    observedAt: new Date().toISOString(),
  });
  const result = await scenario.journal.sink.append(event, {
    expected: {
      kind: 'cursor',
      cursor: { streamId: head.streamId, sequence: head.sequence, eventId: head.eventId },
    },
    signal: new AbortController().signal,
  });
  if (result.state !== 'appended') {
    throw new Error('Runtime event append conflicted.');
  }
  return event;
};

describe('Dialogue persistence edge contracts', () => {
  let scenario: DialogueScenario;

  beforeAll(async () => {
    scenario = await startDialogueScenario();
  });

  afterAll(async () => {
    if (scenario !== undefined) {
      await scenario.close();
    }
  }, 30_000);

  test('rolls back a UTF-8 completion whose byte count or digest does not match', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'UTF-8 completion integrity' });
    const turn = await scenario.client.send(dialogue.id, 'Write a Unicode response');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.text('Hello 👋');
    await expect
      .poll(() => scenario.client.history(dialogue.id))
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: 'AGENT', status: 'STREAMING', text: 'Hello 👋' }),
        ]),
      );
    const storedTurn = await scenario.prisma.dialogueTurn.findUniqueOrThrow({
      where: { id: turn.id },
    });
    if (storedTurn.runtimeSessionId === null) {
      throw new Error('UTF-8 turn has no runtime session.');
    }
    const before = await Promise.all([
      scenario.prisma.agentSessionEventStream.findUniqueOrThrow({
        where: { sessionId: storedTurn.runtimeSessionId },
      }),
      scenario.prisma.agentSessionEvent.count({
        where: { sessionId: storedTurn.runtimeSessionId },
      }),
      scenario.prisma.dialogueChange.count({ where: { dialogueId: dialogue.id } }),
      scenario.client.history(dialogue.id),
    ]);

    const text = 'Hello 👋';
    const correctBytes = Buffer.byteLength(text, 'utf8');
    const correctDigest = createHash('sha256').update(text, 'utf8').digest('hex');
    await expect(
      appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
        ...base,
        type: 'assistant.message.completed',
        turnId: turn.id,
        role: 'assistant',
        contentBytes: correctBytes - 1,
        contentSha256: correctDigest,
      })),
    ).rejects.toThrow('Assistant completion does not match the persisted text.');
    await expect(
      appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
        ...base,
        type: 'assistant.message.completed',
        turnId: turn.id,
        role: 'assistant',
        contentBytes: correctBytes,
        contentSha256: 'invalid-digest',
      })),
    ).rejects.toThrow('Assistant completion does not match the persisted text.');
    const after = await Promise.all([
      scenario.prisma.agentSessionEventStream.findUniqueOrThrow({
        where: { sessionId: storedTurn.runtimeSessionId },
      }),
      scenario.prisma.agentSessionEvent.count({
        where: { sessionId: storedTurn.runtimeSessionId },
      }),
      scenario.prisma.dialogueChange.count({ where: { dialogueId: dialogue.id } }),
      scenario.client.history(dialogue.id),
    ]);
    expect(after).toEqual(before);

    await execution.complete();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        status: 'READY',
        lastOutcome: 'COMPLETED',
      });
  });

  test('recovers a missing local item and delivers identical cursored changes to two clients', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Item recovery' });
    const snapshot = await scenario.client.historyPage(dialogue.id);
    const firstOpening = scenario.client.subscribe(dialogue.id, snapshot.snapshotCursor);
    const secondOpening = scenario.client.subscribe(dialogue.id, snapshot.snapshotCursor);
    const turn = await scenario.client.send(dialogue.id, 'Recover streamed text');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.text('First');
    const [firstStream, secondStream] = await Promise.all([firstOpening, secondOpening]);
    const [firstChange, duplicateChange] = await Promise.all([
      firstStream.expectText({ text: 'First' }),
      secondStream.expectText({ text: 'First' }),
    ]);
    expect(duplicateChange).toEqual(firstChange);
    if (firstChange.itemId === null) {
      throw new Error('Text change has no item identity.');
    }
    if (firstChange.itemVersion === null) {
      throw new Error('Text change has no item version.');
    }
    await firstStream.close();

    await execution.text(' second');
    const liveSecond = await secondStream.expectText({
      text: ' second',
      itemId: firstChange.itemId,
      baseItemVersion: firstChange.itemVersion,
    });
    const replay = await scenario.client.subscribe(dialogue.id, firstChange.cursor);
    const replayedSecond = await replay.expectText({
      text: ' second',
      itemId: firstChange.itemId,
      baseItemVersion: firstChange.itemVersion,
    });
    expect(replayedSecond).toEqual(liveSecond);
    const recovered = await scenario.client.historyItem(dialogue.id, firstChange.itemId);
    expect(recovered).toMatchObject({
      id: firstChange.itemId,
      text: 'First second',
      version: liveSecond.itemVersion,
    });
    await replay.close();
    await secondStream.close();
    await execution.complete();
  });

  test('projects injected progress and usage as current bounded state', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Progress and usage' });
    const turn = await scenario.client.send(dialogue.id, 'Report progress and usage');
    await scenario.agent.expectTurn(turn);
    const storedTurn = await scenario.prisma.dialogueTurn.findUniqueOrThrow({
      where: { id: turn.id },
    });
    if (storedTurn.runtimeSessionId === null) {
      throw new Error('Progress turn has no runtime session.');
    }
    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'agent.progress',
      turnId: turn.id,
      message: 'Indexing source files',
    }));
    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'usage.updated',
      turnId: turn.id,
      usage: {
        scope: 'session_cumulative',
        inputTokens: 21,
        outputTokens: 8,
        totalTokens: 29,
      },
    }));
    expect(await scenario.client.dialogue(dialogue.id)).toMatchObject({
      progress: 'Indexing source files',
      status: 'RUNNING',
    });
    expect(await scenario.client.history(dialogue.id)).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'USAGE', status: 'COMPLETED' })]),
    );
    const usage = await scenario.prisma.dialogueHistoryItem.findFirstOrThrow({
      where: { dialogueId: dialogue.id, kind: 'USAGE' },
    });
    expect(usage.payload).toMatchObject({
      usage: { inputTokens: 21, outputTokens: 8, totalTokens: 29 },
    });
  });

  test('persists provider process exit as a failed turn with partial text', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Provider process exit' });
    const turn = await scenario.client.send(dialogue.id, 'Exit after partial output');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.text('Before provider exit');
    await execution.exit();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id), { timeout: 5_000 })
      .toMatchObject({
        status: 'READY',
        lastOutcome: 'FAILED',
      });
    expect(await scenario.client.history(dialogue.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'AGENT',
          status: 'PARTIAL',
          text: 'Before provider exit',
        }),
        expect.objectContaining({ kind: 'RESULT', status: 'FAILED' }),
      ]),
    );
  });

  test('keeps a session-scoped interaction pending after its current turn completes', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Session interaction' });
    const turn = await scenario.client.send(dialogue.id, 'Request outside the turn scope');
    await scenario.agent.expectTurn(turn);
    const storedTurn = await scenario.prisma.dialogueTurn.findUniqueOrThrow({
      where: { id: turn.id },
    });
    if (storedTurn.runtimeSessionId === null) {
      throw new Error('Session interaction turn has no runtime session.');
    }
    const requestId = crypto.randomUUID();
    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'interaction.requested',
      scope: { kind: 'opening' },
      request: {
        kind: 'permission',
        requestId,
        action: { kind: 'execute', title: 'Session action' },
        options: [{ optionId: 'allow', kind: 'allow_once', label: 'Allow' }],
      },
    }));
    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'assistant.message.completed',
      turnId: turn.id,
      role: 'assistant',
      contentBytes: 0,
      contentSha256: createHash('sha256').update('', 'utf8').digest('hex'),
    }));
    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'turn.completed',
      turnId: turn.id,
      outcome: { status: 'completed' },
    }));
    expect(await scenario.client.dialogue(dialogue.id)).toMatchObject({
      activeTurnId: null,
      pendingCount: 1,
      status: 'WAITING',
    });
    expect(await scenario.client.interactions(dialogue.id)).toEqual([
      expect.objectContaining({ status: 'PENDING', turnId: null }),
    ]);

    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'interaction.resolved',
      scope: { kind: 'opening' },
      requestId,
      response: { kind: 'permission', outcome: 'selected', optionId: 'allow' },
    }));
    expect(await scenario.client.dialogue(dialogue.id)).toMatchObject({
      activeTurnId: null,
      pendingCount: 0,
      status: 'READY',
    });
    expect(await scenario.client.interactions(dialogue.id)).toEqual([
      expect.objectContaining({ status: 'RESOLVED' }),
    ]);
  });

  test('abandons a session-scoped interaction when Core loses its runtime session', async () => {
    const dialogue = await scenario.client.createDialogue({
      title: 'Recovered session interaction',
    });
    const turn = await scenario.client.send(dialogue.id, 'Leave a session question pending');
    await scenario.agent.expectTurn(turn);
    const storedTurn = await scenario.prisma.dialogueTurn.findUniqueOrThrow({
      where: { id: turn.id },
    });
    if (storedTurn.runtimeSessionId === null) {
      throw new Error('Recovered session interaction turn has no runtime session.');
    }
    const requestId = crypto.randomUUID();
    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'interaction.requested',
      scope: { kind: 'opening' },
      request: {
        kind: 'permission',
        requestId,
        action: { kind: 'execute', title: 'Recovered session action' },
        options: [{ optionId: 'allow', kind: 'allow_once', label: 'Allow' }],
      },
    }));
    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'assistant.message.completed',
      turnId: turn.id,
      role: 'assistant',
      contentBytes: 0,
      contentSha256: createHash('sha256').update('', 'utf8').digest('hex'),
    }));
    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'turn.completed',
      turnId: turn.id,
      outcome: { status: 'completed' },
    }));

    await scenario.recover();

    expect(await scenario.client.dialogue(dialogue.id)).toMatchObject({
      activeTurnId: null,
      pendingCount: 0,
      runtimeSessionId: null,
      status: 'UNCERTAIN',
    });
    expect(await scenario.client.interactions(dialogue.id)).toEqual([
      expect.objectContaining({ status: 'ABANDONED', turnId: null }),
    ]);
    expect(await scenario.client.history(dialogue.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'INTERACTION', status: 'ABANDONED' }),
      ]),
    );
  });

  test('abandons a session-scoped interaction when its runtime session closes', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Closed session interaction' });
    const turn = await scenario.client.send(dialogue.id, 'Close with a session question pending');
    await scenario.agent.expectTurn(turn);
    const storedTurn = await scenario.prisma.dialogueTurn.findUniqueOrThrow({
      where: { id: turn.id },
    });
    if (storedTurn.runtimeSessionId === null) {
      throw new Error('Closed session interaction turn has no runtime session.');
    }
    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'interaction.requested',
      scope: { kind: 'opening' },
      request: {
        kind: 'permission',
        requestId: crypto.randomUUID(),
        action: { kind: 'execute', title: 'Closing session action' },
        options: [{ optionId: 'allow', kind: 'allow_once', label: 'Allow' }],
      },
    }));
    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'assistant.message.completed',
      turnId: turn.id,
      role: 'assistant',
      contentBytes: 0,
      contentSha256: createHash('sha256').update('', 'utf8').digest('hex'),
    }));
    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'turn.completed',
      turnId: turn.id,
      outcome: { status: 'completed' },
    }));

    const snapshot = await scenario.client.historyPage(dialogue.id);
    const changeStream = scenario.client.subscribe(dialogue.id, snapshot.snapshotCursor);
    await appendCurrent(scenario, storedTurn.runtimeSessionId, (base) => ({
      ...base,
      type: 'session.closed',
      outcome: 'closed',
    }));

    const abandonedChange = await (await changeStream).nextKind('HISTORY_ITEM_UPSERTED');
    expect(abandonedChange.turnId).toBeNull();
    await (await changeStream).close();

    expect(await scenario.client.dialogue(dialogue.id)).toMatchObject({
      activeTurnId: null,
      pendingCount: 0,
      runtimeSessionId: null,
      status: 'READY',
    });
    expect(await scenario.client.interactions(dialogue.id)).toEqual([
      expect.objectContaining({ status: 'ABANDONED', turnId: null }),
    ]);
    expect(await scenario.client.history(dialogue.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'INTERACTION', status: 'ABANDONED' }),
      ]),
    );
  });

  test('keeps forked operations as history without replaying them', async () => {
    const origin = await scenario.client.createDialogue({ title: 'Historical operation origin' });
    const originTurn = await scenario.client.send(origin.id, 'Perform one operation');
    const originExecution = await scenario.agent.expectTurn(originTurn);
    await originExecution.tool('historic-tool', 'Historic operation marker', 'completed');
    await originExecution.text('Origin result');
    await originExecution.complete();
    await expect.poll(() => scenario.client.dialogue(origin.id)).toMatchObject({ status: 'READY' });

    const fork = await scenario.client.fork(origin.id, originTurn.id, 'Historical operation fork');
    const forkHistory = await scenario.client.history(fork.id);
    const copiedOperation = forkHistory.find(({ kind }) => kind === 'OPERATION');
    expect(copiedOperation).toMatchObject({
      historical: true,
      status: 'COMPLETED',
      text: 'Historic operation marker',
      turnId: null,
    });
    if (copiedOperation === undefined) {
      throw new Error('Fork did not copy the historical operation.');
    }
    expect(
      await scenario.prisma.dialogueHistoryItem.findUniqueOrThrow({
        where: { id: copiedOperation.id },
      }),
    ).toMatchObject({ sourceKey: expect.stringContaining(`fork:${origin.id}:`) });

    const forkTurn = await scenario.client.send(fork.id, 'Continue after historical work');
    const forkExecution = await scenario.agent.expectTurn(forkTurn);
    expect(forkExecution.prompt).not.toContain('Historic operation marker');
    expect(scenario.agent.pendingExecutionCount).toBe(0);
    await forkExecution.text('Fork continuation');
    await forkExecution.complete();
    expect(
      (await scenario.client.history(origin.id)).some(({ text }) => text === 'Fork continuation'),
    ).toBe(false);
  });

  test('serializes a command write before a concurrent runtime event commit', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Writer ordering target' });
    const turn = await scenario.client.send(dialogue.id, 'Wait for ordered write');
    const execution = await scenario.agent.expectTurn(turn);
    const snapshot = await scenario.client.historyPage(dialogue.id);
    const streamOpening = scenario.client.subscribeAll(snapshot.snapshotCursor);
    const feedBefore = await scenario.prisma.dialogueFeedPosition.findUniqueOrThrow({
      where: { id: 1 },
    });
    const commandTitle = `Writer ordering command ${crypto.randomUUID()}`;
    const barrier = scenario.transactions.holdNextTransaction();
    const create = scenario.client.createDialogue({ title: commandTitle });
    await barrier.reached;
    const text = execution.text('Ordered event');
    try {
      expect(
        await scenario.prisma.dialogue.findFirst({ where: { title: commandTitle } }),
      ).toBeNull();
    } finally {
      barrier.release();
    }
    const created = await create;
    await text;
    await expect
      .poll(() => scenario.client.history(dialogue.id))
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: 'AGENT', text: 'Ordered event' }),
        ]),
      );

    const commandChange = await scenario.prisma.dialogueChange.findFirstOrThrow({
      where: { dialogueId: created.id, sequence: { gt: feedBefore.sequence } },
      orderBy: { sequence: 'asc' },
    });
    const eventChange = await scenario.prisma.dialogueChange.findFirstOrThrow({
      where: {
        dialogueId: dialogue.id,
        kind: 'HISTORY_TEXT_APPENDED',
        sequence: { gt: feedBefore.sequence },
      },
      orderBy: { sequence: 'asc' },
    });
    expect(commandChange.sequence).toBeLessThan(eventChange.sequence);
    const stream = await streamOpening;
    try {
      const commandFrame = await stream.next();
      const eventFrame = await stream.next();
      expect(commandFrame).toMatchObject({
        dialogueId: created.id,
        kind: 'SUMMARY_UPDATED',
      });
      expect(eventFrame).toMatchObject({
        dialogueId: dialogue.id,
        kind: 'HISTORY_TEXT_APPENDED',
        textDelta: 'Ordered event',
      });
    } finally {
      await stream.close();
    }
    await execution.complete();
  });

  test('persists response delivery uncertainty when delivery fails after save', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Response delivery failure' });
    const turn = await scenario.client.send(dialogue.id, 'Request then exit');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.requestPermission();
    await expect.poll(() => scenario.client.interactions(dialogue.id)).toHaveLength(1);
    const interaction = (await scenario.client.interactions(dialogue.id))[0];
    if (interaction === undefined) {
      throw new Error('Permission interaction was not persisted.');
    }
    const barrier = scenario.execution.holdNextResponse();
    const response = scenario.client.respond(dialogue.id, interaction.id, crypto.randomUUID(), {
      kind: 'permission',
      outcome: 'selected',
      optionId: 'allow-test-action',
    });
    await barrier.reached;
    await expect
      .poll(() => scenario.client.interactions(dialogue.id))
      .toEqual([expect.objectContaining({ status: 'RESPONDING' })]);
    barrier.fail();
    await expect(response).rejects.toThrow('Controlled interaction response delivery failure.');
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        activeTurnId: null,
        lastOutcome: 'UNCERTAIN',
        pendingCount: 0,
        status: 'UNCERTAIN',
      });
    await expect
      .poll(() => scenario.client.interactions(dialogue.id))
      .toEqual([expect.objectContaining({ status: 'ABANDONED' })]);
    expect(await scenario.client.history(dialogue.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'INTERACTION', status: 'ABANDONED' }),
        expect.objectContaining({ kind: 'RESULT', status: 'INTERRUPTED' }),
      ]),
    );
  }, 15_000);
});
