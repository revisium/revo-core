import { Logger } from '@nestjs/common';
import {
  AgentManagerError,
  type AgentManager,
  type AgentSessionEvent,
} from '@revisium/revo-agent-runtime';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
/* oxlint-disable no-await-in-loop -- Scenario steps consume ordered GraphQL and SSE state. */

import { AGENT_MANAGER } from '../../../src/infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  startDialogueScenario,
  type DialogueScenario,
} from '../../support/dialogue/dialogue-scenario.js';

describe('Persistent dialogues over GraphQL', () => {
  let scenario: DialogueScenario;

  beforeAll(async () => {
    scenario = await startDialogueScenario();
  });

  afterAll(async () => {
    if (scenario !== undefined) {
      await scenario.close();
    }
  }, 30_000);

  test('creates an actor-free dialogue with persisted ready state', async () => {
    const created = await scenario.client.createDialogue({ title: 'Architecture review' });
    const dialogue = await scenario.client.dialogue(created.id);

    expect(dialogue).toMatchObject({ status: 'READY', unreadCount: 0 });
  });

  test('rejects malformed agent configuration input at the GraphQL boundary', async () => {
    await expect(
      scenario.client.createDialogue({
        title: 'Malformed configuration',
        agentConfiguration: { selections: { model: 42 } },
      }),
    ).rejects.toThrow('Invalid agentConfiguration.');
  });

  test('rejects corrupt persisted configuration before opening a runtime session', async () => {
    const manager = scenario.app.get<AgentManager>(AGENT_MANAGER);
    const dialogue = await scenario.client.createDialogue({
      title: 'Corrupt stored configuration',
    });
    await scenario.prisma.dialogue.update({
      where: { id: dialogue.id },
      data: { agentConfiguration: { selections: 42 } },
    });
    const open = vi.spyOn(manager.sessions, 'open');

    try {
      const turn = await scenario.client.send(dialogue.id, 'This must not reach the agent.');
      await expect
        .poll(
          async () =>
            (await scenario.client.history(dialogue.id)).find(
              ({ kind, turnId }) => kind === 'RESULT' && turnId === turn.id,
            ),
          { timeout: 5_000 },
        )
        .toMatchObject({ status: 'FAILED' });
      const result = (await scenario.client.history(dialogue.id)).find(
        ({ kind, turnId }) => kind === 'RESULT' && turnId === turn.id,
      );
      expect(result?.payload).toEqual({ message: 'Dialogue turn dispatch failed.' });
      expect(result?.payload).not.toHaveProperty('details');
      expect(open).not.toHaveBeenCalled();
    } finally {
      await scenario.prisma.dialogue.update({
        where: { id: dialogue.id },
        data: { agentConfiguration: { selections: {} } },
      });
      open.mockRestore();
    }
  });

  test('delivers selected dialogue details and sidebar status on the same stream', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Multiplex dialogue' });
    const snapshot = await scenario.client.historyPage(dialogue.id);
    const feed = await scenario.client.watchDialogue(dialogue.id, snapshot.snapshotCursor);

    try {
      const turn = await scenario.client.send(dialogue.id, 'Send through one stream');
      const execution = await scenario.agent.expectTurn(turn);
      await execution.text('Multiplex response');
      await execution.complete();

      await expect.poll(feed.changes).toContainEqual({
        kind: 'HISTORY_TEXT_APPENDED',
        dialogueId: dialogue.id,
        textDelta: 'Multiplex response',
      });
      await expect.poll(feed.summaries).toContainEqual({
        kind: 'SUMMARY_UPDATED',
        dialogueId: dialogue.id,
        summary: { id: dialogue.id, status: 'READY', unreadCount: 1 },
      });
    } finally {
      await feed.close();
    }
  });

  test('keeps sidebar updates subscribed after leaving the selected dialogue', async () => {
    const selected = await scenario.client.createDialogue({ title: 'Selected dialogue' });
    const snapshot = await scenario.client.historyPage(selected.id);
    const feed = await scenario.client.watchDialogue(selected.id, snapshot.snapshotCursor);

    try {
      await feed.closeDetails();
      const other = await scenario.client.createDialogue({ title: 'New sidebar entry' });

      await expect.poll(feed.summaries).toContainEqual({
        kind: 'SUMMARY_UPDATED',
        dialogueId: other.id,
        summary: { id: other.id, status: 'READY', unreadCount: 0 },
      });
    } finally {
      await feed.close();
    }
  });

  test('applies the persisted agent configuration when opening the runtime session', async () => {
    const dialogue = await scenario.client.createDialogue({
      title: 'Configured runtime',
      agentConfiguration: { selections: { model: 'model-b' } },
    });
    const turn = await scenario.client.send(dialogue.id, 'Use the selected model');
    const execution = await scenario.agent.expectTurn(turn);
    await expect(scenario.agent.waitForConfiguration('model')).resolves.toBe('model-b');
    await execution.text('Configured');
    await execution.complete();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({ status: 'READY' });
  });

  test('projects streamed agent chunks into one stable history item', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Streaming response' });

    const turn = await scenario.client.send(dialogue.id, 'Say hello');
    const execution = await scenario.agent.expectTurn(turn);
    expect(turn.status).toBe('QUEUED');
    expect(execution.prompt).toBe('Say hello');
    await execution.text('Hel');

    await expect
      .poll(async () =>
        (await scenario.client.history(dialogue.id)).filter(({ kind }) => kind === 'MESSAGE'),
      )
      .toEqual([
        expect.objectContaining({ source: 'USER', text: 'Say hello' }),
        expect.objectContaining({
          source: 'AGENT',
          status: 'STREAMING',
          text: 'Hel',
          version: '1',
        }),
      ]);
    const firstHistory = await scenario.client.history(dialogue.id);
    const firstAgentItem = firstHistory.find(({ source }) => source === 'AGENT');
    expect(firstAgentItem).toBeDefined();
    if (firstAgentItem === undefined) {
      throw new Error('Agent item was not projected.');
    }

    await execution.text('lo');
    await execution.complete();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({ status: 'READY' });

    const history = await scenario.client.history(dialogue.id);
    expect(history.filter(({ kind }) => kind === 'MESSAGE')).toEqual([
      expect.objectContaining({ source: 'USER', text: 'Say hello' }),
      expect.objectContaining({
        id: firstAgentItem.id,
        source: 'AGENT',
        status: 'COMPLETED',
        text: 'Hello',
      }),
    ]);
    const completedAgentItem = history.find(({ source }) => source === 'AGENT');
    expect(completedAgentItem).toBeDefined();
    if (completedAgentItem === undefined) {
      throw new Error('Completed agent item was not projected.');
    }
    expect(BigInt(completedAgentItem.version)).toBeGreaterThan(BigInt(firstAgentItem.version));
    const [storedItems, storedDeltas] = await scenario.storage.textProjection(dialogue.id, turn.id);
    expect(storedItems).toHaveLength(1);
    expect(storedItems[0]).toMatchObject({ id: firstAgentItem.id, text: 'Hello' });
    expect(storedDeltas).toEqual([
      { textDelta: 'Hel', baseItemVersion: 0n, itemVersion: 1n },
      { textDelta: 'lo', baseItemVersion: 1n, itemVersion: 2n },
    ]);
  });

  test('deduplicates message admission by command id and rejects changed input', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Command idempotency' });
    const commandId = crypto.randomUUID();
    const turn = await scenario.client.send(dialogue.id, 'Stable input', commandId);
    await expect(
      scenario.client.send(dialogue.id, 'Stable input', commandId),
    ).resolves.toMatchObject({
      id: turn.id,
    });
    await expect(scenario.client.send(dialogue.id, 'Changed input', commandId)).rejects.toThrow(
      'Command id was reused with a different prompt.',
    );
    expect(await scenario.storage.turnCount(dialogue.id)).toBe(1);
    const execution = await scenario.agent.expectTurn(turn);
    await execution.complete();
  });

  test('projects real ACP tool and plan updates as stable bounded history items', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Tool and plan projection' });
    const turn = await scenario.client.send(dialogue.id, 'Report work');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.tool('tool-one', 'Inspect files', 'in_progress');
    await execution.plan([
      { content: 'Inspect', priority: 'high', status: 'in_progress' },
      { content: 'Update', priority: 'medium', status: 'pending' },
    ]);
    await expect
      .poll(() => scenario.client.history(dialogue.id))
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'OPERATION',
            status: 'IN_PROGRESS',
            text: 'Inspect files',
          }),
          expect.objectContaining({ kind: 'PLAN', status: 'IN_PROGRESS' }),
        ]),
      );
    const before = await scenario.storage.historyItem(dialogue.id, 'OPERATION');
    await execution.tool('tool-one', 'Inspect files', 'completed');
    await expect
      .poll(() => scenario.storage.historyItem(dialogue.id, 'OPERATION'))
      .toMatchObject({ id: before.id, status: 'COMPLETED' });
    const stored = await scenario.storage.historyItem(dialogue.id, 'OPERATION');
    expect(stored.version).toBeGreaterThan(before.version);
    await execution.text('Work complete');
    await execution.complete();
  });

  test('replays every committed text delta over SSE after reconnecting from a cursor', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'SSE replay' });
    const initial = await scenario.client.historyPage(dialogue.id);
    const opening = scenario.client.subscribe(dialogue.id, initial.snapshotCursor);
    const turn = await scenario.client.send(dialogue.id, 'Stream through SSE');
    const execution = await scenario.agent.expectTurn(turn);
    const stream = await opening;

    await execution.text('Hel');
    const firstDelta = await stream.expectText({ text: 'Hel', baseItemVersion: '0' });
    expect(firstDelta).toMatchObject({
      dialogueId: dialogue.id,
      baseItemVersion: '0',
      itemVersion: '1',
      textDelta: 'Hel',
      item: null,
      summary: null,
    });
    await expect
      .poll(async () =>
        (await scenario.client.history(dialogue.id)).find(({ source }) => source === 'AGENT'),
      )
      .toMatchObject({ id: firstDelta.itemId, text: 'Hel', version: firstDelta.itemVersion });
    await stream.close();

    await execution.text('lo');
    await execution.complete();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({ status: 'READY' });

    const replay = await scenario.client.subscribe(dialogue.id, firstDelta.cursor);
    try {
      if (firstDelta.itemId === null || firstDelta.itemVersion === null) {
        throw new Error('First text delta has no item identity or version.');
      }
      const secondDelta = await replay.expectText({
        text: 'lo',
        itemId: firstDelta.itemId,
        baseItemVersion: firstDelta.itemVersion,
      });
      expect(secondDelta).toMatchObject({
        itemId: firstDelta.itemId,
        baseItemVersion: firstDelta.itemVersion,
        textDelta: 'lo',
        item: null,
        summary: null,
      });
      const completed = await replay.expectItem();
      expect(completed.item).toMatchObject({
        id: firstDelta.itemId,
        status: 'COMPLETED',
        text: 'Hello',
      });
      expect(BigInt(completed.item?.version ?? '0')).toBeGreaterThan(
        BigInt(secondDelta.itemVersion ?? '0'),
      );
    } finally {
      await replay.close();
    }
  });

  test('keeps partial text when an admitted turn is cancelled', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Cancellation' });
    const turn = await scenario.client.send(dialogue.id, 'Wait for cancellation');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.text('Partial answer');
    await execution.tool('cancelled-tool', 'Long running operation', 'in_progress');
    await execution.waitForCancellation();
    await expect
      .poll(async () =>
        (await scenario.client.history(dialogue.id)).find(({ source }) => source === 'AGENT'),
      )
      .toMatchObject({ status: 'STREAMING', text: 'Partial answer' });

    await scenario.client.cancel(dialogue.id, turn.id);
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        status: 'READY',
        lastOutcome: 'CANCELLED',
      });
    await expect
      .poll(async () =>
        (await scenario.client.history(dialogue.id)).find(({ source }) => source === 'AGENT'),
      )
      .toMatchObject({ status: 'PARTIAL', text: 'Partial answer' });
    await expect
      .poll(() => scenario.client.history(dialogue.id))
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'OPERATION',
            status: 'INTERRUPTED',
            text: 'Long running operation',
          }),
        ]),
      );
  });

  test('cancels a saved command before runtime admission without starting the agent', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Pre-admission cancellation' });
    const barrier = scenario.dispatch.holdNextDispatch();
    const turn = await scenario.client.send(dialogue.id, 'Cancel before dispatch');
    await barrier.reached;
    await scenario.client.cancel(dialogue.id, turn.id);
    barrier.release();

    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        status: 'READY',
        lastOutcome: 'CANCELLED',
        activeTurnId: null,
      });
    const stored = await scenario.prisma.dialogueTurn.findUniqueOrThrow({ where: { id: turn.id } });
    expect(stored).toMatchObject({
      cancelRequested: true,
      dispatchState: 'FINISHED',
      runtimeSessionId: null,
      status: 'CANCELLED',
    });
    const beforeRepeat = await Promise.all([
      scenario.prisma.dialogueHistoryItem.count({
        where: { dialogueId: dialogue.id, kind: 'RESULT' },
      }),
      scenario.prisma.dialogueChange.count({ where: { dialogueId: dialogue.id } }),
    ]);
    await expect(
      scenario.ingestion.interruptTurn({
        dialogueId: dialogue.id,
        turnId: turn.id,
        reason: { kind: 'PRE_ADMISSION_CANCEL' },
      }),
    ).resolves.toEqual({ state: 'ignored' });
    expect(
      await Promise.all([
        scenario.prisma.dialogueHistoryItem.count({
          where: { dialogueId: dialogue.id, kind: 'RESULT' },
        }),
        scenario.prisma.dialogueChange.count({ where: { dialogueId: dialogue.id } }),
      ]),
    ).toEqual(beforeRepeat);
    expect(scenario.agent.pendingExecutionCount).toBe(0);
  });

  test('persists an agent failure after partial output', async () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const dialogue = await scenario.client.createDialogue({ title: 'Agent failure' });
    const turn = await scenario.client.send(dialogue.id, 'Fail after writing');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.text('Before failure');
    await execution.fail();

    await expect
      .poll(() => scenario.client.dialogue(dialogue.id), { timeout: 5_000 })
      .toMatchObject({
        status: 'READY',
        lastOutcome: 'FAILED',
      });
    await expect
      .poll(async () =>
        (await scenario.client.history(dialogue.id)).find(({ source }) => source === 'AGENT'),
      )
      .toMatchObject({ status: 'PARTIAL', text: 'Before failure' });
    const result = (await scenario.client.history(dialogue.id)).find(
      ({ kind }) => kind === 'RESULT',
    );
    expect(result).toMatchObject({
      status: 'FAILED',
      text: 'Internal provider failure.',
      payload: {
        status: 'failed',
        error: {
          message: 'Internal provider failure.',
          code: expect.any(String),
          phase: expect.any(String),
          retryable: false,
        },
      },
    });
    expect(result?.payload).not.toHaveProperty('error.details');
    expect(result?.text).not.toContain('Controlled fake agent failure.');
    expect(JSON.stringify(result?.payload)).not.toContain('Controlled fake agent failure.');
    await expect
      .poll(
        () =>
          logged.mock.calls.filter(
            ([entry]) =>
              typeof entry === 'object' &&
              entry !== null &&
              'operation' in entry &&
              entry.operation === 'dialogue.runtime.turn_result',
          ),
        { timeout: 5_000 },
      )
      .toHaveLength(1);
    const turnDiagnostic = logged.mock.calls.find(
      ([entry]) =>
        typeof entry === 'object' &&
        entry !== null &&
        'operation' in entry &&
        entry.operation === 'dialogue.runtime.turn_result',
    )?.[0];
    expect(turnDiagnostic).toMatchObject({
      runtimeDetails: {
        diagnostic: {
          provider: { code: -32603, message: 'Internal error: Internal provider failure.' },
        },
      },
    });
    logged.mockRestore();
  });

  test('logs a detached runtime-open failure and persists only a stable public reason', async () => {
    const manager = scenario.app.get<AgentManager>(AGENT_MANAGER);
    const failure = new AgentManagerError({
      code: 'revo.agent.protocol_failed',
      message: 'Internal error',
      phase: 'session_opening',
      retryable: false,
      details: {
        diagnostic: {
          provider: { message: 'provider failed authorization=Bearer private-token' },
        },
      },
    });
    failure.stack = 'open stack password=private-password';
    const open = vi.spyOn(manager.sessions, 'open').mockRejectedValueOnce(failure);
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    try {
      const dialogue = await scenario.client.createDialogue({
        title: 'Runtime open failure',
        agentConfiguration: { selections: { model: 'test-model' } },
      });
      const turn = await scenario.client.send(dialogue.id, 'Do not expose this prompt');

      await expect
        .poll(
          async () =>
            (await scenario.client.history(dialogue.id)).find(
              ({ kind, turnId }) => kind === 'RESULT' && turnId === turn.id,
            ),
          { timeout: 5_000 },
        )
        .toMatchObject({
          status: 'FAILED',
          text: 'Internal error',
          payload: { message: 'Internal error' },
        });
      const result = (await scenario.client.history(dialogue.id)).find(
        ({ kind, turnId }) => kind === 'RESULT' && turnId === turn.id,
      );
      expect(result?.text).not.toContain('private-token');
      expect(JSON.stringify(result?.payload)).not.toContain('private-token');
      const diagnostics = logged.mock.calls
        .map(([entry]) => entry)
        .filter(
          (entry) =>
            typeof entry === 'object' &&
            entry !== null &&
            'operation' in entry &&
            entry.operation === 'dialogue.runtime.open',
        );
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toMatchObject({
        dialogueId: dialogue.id,
        turnId: turn.id,
        agentId: 'test-acp',
        agentVersion: '1.0.0',
        error: {
          message: 'Internal error',
          stack: 'open stack password=[REDACTED]',
        },
      });
    } finally {
      open.mockRestore();
      logged.mockRestore();
    }
  }, 15_000);

  test('persists and resolves a permission with idempotent response commands', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Permission' });
    const turn = await scenario.client.send(dialogue.id, 'Request permission');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.requestPermission();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        status: 'WAITING',
        unreadCount: 1,
      });
    const interactions = await scenario.client.interactions(dialogue.id);
    expect(interactions).toHaveLength(1);
    const interaction = interactions[0];
    if (interaction === undefined) {
      throw new Error('Permission interaction was not persisted.');
    }
    const response = { kind: 'permission', outcome: 'selected', optionId: 'allow-test-action' };

    await scenario.client.respond(dialogue.id, interaction.id, 'permission-command', response);
    await expect
      .poll(() => scenario.client.interactions(dialogue.id))
      .toEqual([expect.objectContaining({ status: 'RESOLVED', response })]);
    await expect(
      scenario.client.respond(dialogue.id, interaction.id, 'permission-command', response),
    ).resolves.toMatchObject({ id: interaction.id });
    await expect(
      scenario.client.respond(dialogue.id, interaction.id, 'permission-command', {
        kind: 'permission',
        outcome: 'denied',
      }),
    ).rejects.toThrow('Interaction response command was reused with different data.');

    await execution.text('Allowed');
    await execution.complete();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        status: 'READY',
        lastOutcome: 'COMPLETED',
      });
  });

  test('correlates identical concurrent prompts when fake prompt arrival is reversed', async () => {
    scenario.agent.pauseTurns();
    try {
      const firstDialogue = await scenario.client.createDialogue({ title: 'First correlation' });
      const secondDialogue = await scenario.client.createDialogue({ title: 'Second correlation' });
      const [firstTurn, secondTurn] = await Promise.all([
        scenario.client.send(firstDialogue.id, 'Identical prompt'),
        scenario.client.send(secondDialogue.id, 'Identical prompt'),
      ]);

      await scenario.agent.releaseTurn(secondTurn);
      await scenario.agent.waitForPrompt(secondTurn);
      await scenario.agent.releaseTurn(firstTurn);
      await scenario.agent.waitForPrompt(firstTurn);
      const firstExecution = await scenario.agent.expectTurn(firstTurn);
      const secondExecution = await scenario.agent.expectTurn(secondTurn);

      expect(secondExecution.turnId).toBe(secondTurn.id);
      expect(firstExecution.turnId).toBe(firstTurn.id);
      expect(secondExecution.prompt).toBe('Identical prompt');
      expect(firstExecution.prompt).toBe('Identical prompt');
      await Promise.all([
        secondExecution.text('Second response').then(() => secondExecution.complete()),
        firstExecution.text('First response').then(() => firstExecution.complete()),
      ]);
      await expect
        .poll(() => scenario.client.dialogue(firstDialogue.id))
        .toMatchObject({
          status: 'READY',
        });
      await expect
        .poll(() => scenario.client.dialogue(secondDialogue.id))
        .toMatchObject({
          status: 'READY',
        });
      const [firstHistory, secondHistory] = await Promise.all([
        scenario.client.history(firstDialogue.id),
        scenario.client.history(secondDialogue.id),
      ]);
      expect(firstHistory.some(({ text }) => text === 'First response')).toBe(true);
      expect(firstHistory.some(({ text }) => text === 'Second response')).toBe(false);
      expect(secondHistory.some(({ text }) => text === 'Second response')).toBe(true);
      expect(secondHistory.some(({ text }) => text === 'First response')).toBe(false);
    } finally {
      scenario.agent.resumeTurns();
    }
  });

  test('seeds a completed fork prefix into a new runtime session', async () => {
    const origin = await scenario.client.createDialogue({ title: 'Fork origin' });
    const originTurn = await scenario.client.send(origin.id, 'Original marker');
    const originExecution = await scenario.agent.expectTurn(originTurn);
    await originExecution.text('Original answer marker');
    await originExecution.complete();
    await expect.poll(() => scenario.client.dialogue(origin.id)).toMatchObject({ status: 'READY' });

    const fork = await scenario.client.fork(origin.id, originTurn.id, 'Fork target');
    expect(fork).toMatchObject({
      originDialogueId: origin.id,
      originTurnId: originTurn.id,
      unreadCount: 0,
    });
    const forkTurn = await scenario.client.send(fork.id, 'Continue independently');
    const forkExecution = await scenario.agent.expectTurn(forkTurn);
    expect(forkExecution.prompt).toContain('User: Original marker');
    expect(forkExecution.prompt).toContain('Assistant: Original answer marker');
    expect(forkExecution.prompt).toContain('User: Continue independently');
    await forkExecution.text('Fork-only response');
    await forkExecution.complete();
    await expect.poll(() => scenario.client.dialogue(fork.id)).toMatchObject({ status: 'READY' });

    const originHistory = await scenario.client.history(origin.id);
    expect(originHistory.some(({ text }) => text === 'Fork-only response')).toBe(false);
  });

  test('deduplicates a persisted dialogue delta without changing its projection or feed', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Duplicate event' });
    const turn = await scenario.client.send(dialogue.id, 'Write once');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.text('Once');
    await expect
      .poll(async () =>
        (await scenario.client.history(dialogue.id)).find(({ source }) => source === 'AGENT'),
      )
      .toMatchObject({ text: 'Once' });
    const event = await scenario.storage.latestEvent(turn.id, 'assistant.message.delta');
    const { sessionId } = await scenario.storage.runtimeBinding(turn.id);
    const before = await scenario.storage.atomicState(dialogue.id, sessionId);
    const signal = new AbortController().signal;
    await expect(
      scenario.journal.sink.append(event, { expected: { kind: 'empty' }, signal }),
    ).resolves.toEqual({ state: 'appended' });
    const changed = { ...event, content: 'Changed reuse' } as AgentSessionEvent;
    await expect(
      scenario.journal.sink.append(changed, { expected: { kind: 'empty' }, signal }),
    ).resolves.toMatchObject({ state: 'conflict' });
    const after = await scenario.storage.atomicState(dialogue.id, sessionId);
    expect(after).toEqual(before);
    await execution.complete();
  });

  test('rolls raw event, projection, and feed back when persistence fails after change insertion', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Atomic rollback' });
    const turn = await scenario.client.send(dialogue.id, 'Hold before persistence');
    const execution = await scenario.agent.expectTurn(turn);
    const history = await scenario.client.historyPage(dialogue.id);
    const { sessionId, head } = await scenario.storage.runtimeBinding(turn.id);
    const before = await scenario.storage.atomicState(dialogue.id, sessionId);
    const changeStream = await scenario.client.subscribe(dialogue.id, history.snapshotCursor);
    const pendingChange = changeStream.next();
    const barrier = scenario.changes.holdAndFailAfterNextChange();
    const event: AgentSessionEvent = {
      schemaVersion: 'agent-session-event/v1',
      sessionId,
      streamId: head.streamId,
      sequence: head.sequence + 1,
      eventId: crypto.randomUUID(),
      observedAt: new Date().toISOString(),
      type: 'assistant.message.delta',
      turnId: turn.id,
      content: 'Must roll back',
    };
    const failedAppend = scenario.journal.sink.append(event, {
      expected: {
        kind: 'cursor',
        cursor: { streamId: head.streamId, sequence: head.sequence, eventId: head.eventId },
      },
      signal: new AbortController().signal,
    });
    await barrier.reached;
    await expect(scenario.client.history(dialogue.id)).resolves.toEqual(
      expect.not.arrayContaining([expect.objectContaining({ text: 'Must roll back' })]),
    );
    await expect(
      Promise.race([
        pendingChange.then(() => 'event'),
        new Promise<'held'>((resolve) => setTimeout(() => resolve('held'), 150)),
      ]),
    ).resolves.toBe('held');
    barrier.fail();
    await expect(failedAppend).rejects.toThrow(
      'Controlled failure after held dialogue change insertion.',
    );
    const after = await scenario.storage.atomicState(dialogue.id, sessionId);
    expect(after).toEqual(before);
    expect(
      (await scenario.client.history(dialogue.id)).some(({ source }) => source === 'AGENT'),
    ).toBe(false);
    await execution.text('Committed after rollback');
    await expect(pendingChange).resolves.toMatchObject({
      kind: 'HISTORY_TEXT_APPENDED',
      textDelta: 'Committed after rollback',
    });
    await changeStream.close();
    await execution.complete();
  });

  test('freezes history membership while later pages hydrate current text and SSE fills the gap', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'History snapshot' });
    const turn = await scenario.client.send(dialogue.id, 'Paginate while streaming');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.text('First');
    await expect
      .poll(() => scenario.client.history(dialogue.id))
      .toEqual(
        expect.arrayContaining([expect.objectContaining({ source: 'AGENT', text: 'First' })]),
      );
    const firstPage = await scenario.client.historyPage(dialogue.id, 1);
    expect(firstPage).toMatchObject({ totalCount: 2, pageInfo: { hasNextPage: true } });
    const endCursor = firstPage.pageInfo.endCursor;
    if (endCursor === undefined) {
      throw new Error('First history page has no continuation cursor.');
    }
    await execution.text(' second');
    await expect
      .poll(async () => scenario.client.historyPage(dialogue.id, 1, endCursor))
      .toMatchObject({
        edges: [{ node: { source: 'AGENT', text: 'First second' } }],
      });
    const secondPage = await scenario.client.historyPage(dialogue.id, 1, endCursor);
    expect(secondPage.snapshotCursor).toBe(firstPage.snapshotCursor);
    expect(secondPage.observedSignificantSequence).toBe(firstPage.observedSignificantSequence);
    expect(secondPage.edges).toEqual([
      expect.objectContaining({
        node: expect.objectContaining({ source: 'AGENT', text: 'First second' }),
      }),
    ]);
    const changeStream = await scenario.client.subscribe(dialogue.id, firstPage.snapshotCursor);
    const delta = await changeStream.expectText({ text: ' second' });
    const pagedItem = secondPage.edges[0]?.node;
    if (pagedItem === undefined) {
      throw new Error('Second history page has no item.');
    }
    expect(delta.itemId).toBe(pagedItem.id);
    const applyDelta = BigInt(pagedItem.version) === BigInt(delta.baseItemVersion ?? '-1');
    expect(applyDelta).toBe(false);
    expect(pagedItem.text).toBe('First second');

    await execution.complete();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({ status: 'READY' });
    const frozenEnd = await scenario.client.historyPage(dialogue.id, 10, endCursor);
    expect(frozenEnd.totalCount).toBe(2);
    expect(frozenEnd.edges.some(({ node }) => node.kind === 'RESULT')).toBe(false);
    await changeStream.close();
  });

  test('advances the read watermark monotonically without consuming a racing interaction', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Read race' });
    const firstTurn = await scenario.client.send(dialogue.id, 'Create a significant result');
    const firstExecution = await scenario.agent.expectTurn(firstTurn);
    await firstExecution.text('Completed response');
    await firstExecution.complete();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        status: 'READY',
        unreadCount: 1,
      });
    const completed = await scenario.client.dialogue(dialogue.id);
    const observed = (await scenario.client.historyPage(dialogue.id)).observedSignificantSequence;
    expect(observed).toBe(completed.significantSequence);

    const secondTurn = await scenario.client.send(dialogue.id, 'Race the read marker');
    const secondExecution = await scenario.agent.expectTurn(secondTurn);
    await Promise.all([
      scenario.client.markRead(dialogue.id, observed),
      secondExecution.requestPermission(),
    ]);
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        status: 'WAITING',
        readSignificantSequence: observed,
        unreadCount: 1,
      });
    await expect(scenario.client.markRead(dialogue.id, observed)).resolves.toMatchObject({
      readSignificantSequence: observed,
      unreadCount: 1,
    });
  });

  test('keeps dialogue and turn waiting until permission and input interactions are resolved', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Multiple interactions' });
    const turn = await scenario.client.send(dialogue.id, 'Request two answers');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.requestPermission();
    await execution.requestInput();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        status: 'WAITING',
        pendingCount: 2,
      });
    await expect
      .poll(() => scenario.prisma.dialogueTurn.findUniqueOrThrow({ where: { id: turn.id } }))
      .toMatchObject({ status: 'WAITING' });
    const interactions = await scenario.client.interactions(dialogue.id);
    const permission = interactions.find(({ request }) => request.kind === 'permission');
    const input = interactions.find(({ request }) => request.kind === 'input');
    if (permission === undefined || input === undefined) {
      throw new Error('Expected permission and input interactions.');
    }

    await scenario.client.respond(dialogue.id, permission.id, 'permission-response', {
      kind: 'permission',
      outcome: 'selected',
      optionId: 'allow-test-action',
    });
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        status: 'WAITING',
        pendingCount: 1,
      });
    await expect
      .poll(() => scenario.prisma.dialogueTurn.findUniqueOrThrow({ where: { id: turn.id } }))
      .toMatchObject({ status: 'WAITING' });

    await scenario.client.respond(dialogue.id, input.id, 'input-response', {
      kind: 'input',
      outcome: 'submitted',
      values: { answer: 'Approved input' },
    });
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        status: 'RUNNING',
        pendingCount: 0,
      });
    await expect
      .poll(() => scenario.prisma.dialogueTurn.findUniqueOrThrow({ where: { id: turn.id } }))
      .toMatchObject({ status: 'RUNNING' });
    const interactionItems = (await scenario.client.history(dialogue.id)).filter(
      ({ kind }) => kind === 'INTERACTION',
    );
    expect(interactionItems).toEqual([
      expect.objectContaining({ status: 'RESOLVED' }),
      expect.objectContaining({ status: 'RESOLVED' }),
    ]);
    const storedPermission = await scenario.prisma.dialogueHistoryItem.findFirstOrThrow({
      where: { dialogueId: dialogue.id, sourceKey: permission.id },
    });
    expect(storedPermission.payload).toMatchObject({
      request: expect.objectContaining({ kind: 'permission', options: expect.any(Array) }),
      response: expect.objectContaining({ kind: 'permission', outcome: 'selected' }),
    });
    await execution.text('All answers received');
    await execution.complete();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        status: 'READY',
        lastOutcome: 'COMPLETED',
      });
  });

  test('streams current summaries for multiple dialogues without loading their histories', async () => {
    const initial = await scenario.client.dialogues(100);
    const firstDialogue = await scenario.client.createDialogue({ title: 'Summary one' });
    const secondDialogue = await scenario.client.createDialogue({ title: 'Summary two' });
    const stream = await scenario.client.subscribeSummaries(
      [firstDialogue.id, secondDialogue.id],
      initial.snapshotCursor,
    );
    try {
      const firstChange = await stream.next();
      const secondChange = await stream.next();
      expect(new Set([firstChange.dialogueId, secondChange.dialogueId])).toEqual(
        new Set([firstDialogue.id, secondDialogue.id]),
      );
      expect(firstChange.summary).toMatchObject({ status: 'READY' });
      expect(secondChange.summary).toMatchObject({ status: 'READY' });

      const [firstTurn, secondTurn] = await Promise.all([
        scenario.client.send(firstDialogue.id, 'Run first summary'),
        scenario.client.send(secondDialogue.id, 'Run second summary'),
      ]);
      const [firstExecution, secondExecution] = await Promise.all([
        scenario.agent.expectTurn(firstTurn),
        scenario.agent.expectTurn(secondTurn),
      ]);
      await Promise.all([firstExecution.text('First live'), secondExecution.text('Second live')]);
      await Promise.all([
        firstExecution.text(' first continuation'),
        secondExecution.text(' second continuation'),
      ]);
      await Promise.all([firstExecution.complete(), secondExecution.complete()]);
      await expect
        .poll(() => scenario.client.dialogue(firstDialogue.id))
        .toMatchObject({
          status: 'READY',
          lastOutcome: 'COMPLETED',
        });
      await expect
        .poll(() => scenario.client.dialogue(secondDialogue.id))
        .toMatchObject({
          status: 'READY',
          lastOutcome: 'COMPLETED',
        });
      const finalChange = await scenario.prisma.dialogueChange.findFirstOrThrow({
        where: {
          dialogueId: { in: [firstDialogue.id, secondDialogue.id] },
          kind: 'SUMMARY_UPDATED',
        },
        orderBy: { sequence: 'desc' },
      });
      const observedChanges = [firstChange, secondChange];
      const deadline = Date.now() + 5_000;
      let observedSequence = 0n;
      while (observedSequence < finalChange.sequence && Date.now() < deadline) {
        const change = await stream.next();
        observedChanges.push(change);
        const decoded = JSON.parse(Buffer.from(change.cursor, 'base64url').toString('utf8')) as {
          readonly value?: unknown;
        };
        if (typeof decoded.value !== 'string') {
          throw new Error('Summary change cursor has no sequence.');
        }
        observedSequence = BigInt(decoded.value);
      }
      expect(observedSequence).toBeGreaterThanOrEqual(finalChange.sequence);
      expect(observedChanges.every(({ kind }) => kind === 'SUMMARY_UPDATED')).toBe(true);
      expect(
        observedChanges.every(({ itemId, textDelta }) => itemId === null && textDelta === null),
      ).toBe(true);
    } finally {
      await stream.close();
    }
  });

  test('rejects malformed, unavailable, and ahead cursors with reload guidance', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Unavailable cursor' });
    await expect(scenario.client.historyPage(dialogue.id, 1, 'not-a-cursor')).rejects.toThrow(
      'INVALID_CURSOR',
    );
    const page = await scenario.client.historyPage(dialogue.id);
    const feed = await scenario.prisma.dialogueFeedPosition.findUniqueOrThrow({ where: { id: 1 } });
    const unavailableSequence = feed.sequence;
    await scenario.client.createDialogue({ title: 'Retained cursor successor' });
    await scenario.prisma.dialogueChange.delete({ where: { sequence: unavailableSequence } });
    const unavailable = Buffer.from(
      JSON.stringify({
        v: 2,
        kind: 'changes',
        value: String(unavailableSequence),
        upper: '',
        snapshot: '',
        observed: '',
      }),
    ).toString('base64url');
    const unavailableStream = await scenario.client.subscribe(dialogue.id, unavailable);
    await expect(unavailableStream.next()).rejects.toThrow('CURSOR_UNAVAILABLE');
    await unavailableStream.close();

    const recovered = await scenario.client.historyPage(dialogue.id);
    expect(recovered.snapshotCursor).not.toBe(page.snapshotCursor);
    const recoveredStream = await scenario.client.subscribe(dialogue.id, recovered.snapshotCursor);
    const turn = await scenario.client.send(dialogue.id, 'Publish after cursor recovery');
    const execution = await scenario.agent.expectTurn(turn);
    await expect(recoveredStream.next()).resolves.toMatchObject({
      dialogueId: dialogue.id,
      kind: 'HISTORY_ITEM_UPSERTED',
    });
    await execution.complete();
    await recoveredStream.close();

    const latestFeed = await scenario.prisma.dialogueFeedPosition.findUniqueOrThrow({
      where: { id: 1 },
    });
    const ahead = Buffer.from(
      JSON.stringify({
        v: 2,
        kind: 'changes',
        value: String(latestFeed.sequence + 1_000_000n),
        upper: '',
        snapshot: '',
        observed: '',
      }),
    ).toString('base64url');
    const aheadStream = await scenario.client.subscribe(dialogue.id, ahead);
    await expect(aheadStream.next()).rejects.toThrow('CURSOR_AHEAD');
    await aheadStream.close();
    expect(page.snapshotCursor).toBe(unavailable);
  }, 15_000);

  test('keeps late events from an old turn out of the currently bound turn projection', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Late event guard' });
    const turn = await scenario.client.send(dialogue.id, 'Complete before late event');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.text('Final answer');
    await execution.complete();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({ status: 'READY' });
    const currentTurn = await scenario.client.send(dialogue.id, 'Current turn');
    await scenario.agent.expectTurn(currentTurn);
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        activeTurnId: currentTurn.id,
        status: 'RUNNING',
      });
    const runtime = await scenario.prisma.dialogueTurn.findUniqueOrThrow({
      where: { id: turn.id },
    });
    if (runtime.runtimeSessionId === null) {
      throw new Error('Completed turn lost its runtime binding.');
    }
    const stream = await scenario.prisma.agentSessionEventStream.findUniqueOrThrow({
      where: { sessionId: runtime.runtimeSessionId },
    });
    if (stream.streamId === null || stream.eventId === null) {
      throw new Error('Runtime stream has no head.');
    }
    const [historyBefore, changesBefore, summaryBefore] = await Promise.all([
      scenario.client.history(dialogue.id),
      scenario.prisma.dialogueChange.count({ where: { dialogueId: dialogue.id } }),
      scenario.client.dialogue(dialogue.id),
    ]);
    const late: AgentSessionEvent = {
      schemaVersion: 'agent-session-event/v1',
      sessionId: runtime.runtimeSessionId,
      streamId: stream.streamId,
      sequence: stream.sequence + 1,
      eventId: crypto.randomUUID(),
      observedAt: new Date().toISOString(),
      type: 'assistant.message.delta',
      turnId: turn.id,
      content: 'Late text',
    };
    await expect(
      scenario.journal.sink.append(late, {
        expected: {
          kind: 'cursor',
          cursor: { streamId: stream.streamId, sequence: stream.sequence, eventId: stream.eventId },
        },
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual({ state: 'appended' });
    const progress: AgentSessionEvent = {
      ...late,
      sequence: late.sequence + 1,
      eventId: crypto.randomUUID(),
      type: 'agent.progress',
      message: 'Late progress',
    };
    await expect(
      scenario.journal.sink.append(progress, {
        expected: {
          kind: 'cursor',
          cursor: { streamId: late.streamId, sequence: late.sequence, eventId: late.eventId },
        },
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual({ state: 'appended' });
    const interaction: AgentSessionEvent = {
      schemaVersion: 'agent-session-event/v1',
      sessionId: runtime.runtimeSessionId,
      streamId: stream.streamId,
      sequence: progress.sequence + 1,
      eventId: crypto.randomUUID(),
      observedAt: new Date().toISOString(),
      type: 'interaction.requested',
      scope: { kind: 'turn', turnId: turn.id },
      request: {
        kind: 'permission',
        requestId: crypto.randomUUID(),
        action: { kind: 'execute', title: 'Late action' },
        options: [{ optionId: 'allow', kind: 'allow_once', label: 'Allow' }],
      },
    };
    await expect(
      scenario.journal.sink.append(interaction, {
        expected: {
          kind: 'cursor',
          cursor: {
            streamId: progress.streamId,
            sequence: progress.sequence,
            eventId: progress.eventId,
          },
        },
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual({ state: 'appended' });
    expect(await scenario.client.history(dialogue.id)).toEqual(historyBefore);
    expect(await scenario.prisma.dialogueChange.count({ where: { dialogueId: dialogue.id } })).toBe(
      changesBefore,
    );
    expect(await scenario.client.interactions(dialogue.id)).toEqual([]);
    expect(await scenario.client.dialogue(dialogue.id)).toMatchObject({
      activeTurnId: currentTurn.id,
      progress: summaryBefore.progress,
      status: 'RUNNING',
    });
  });
});
