import { afterAll, beforeAll, describe, expect, test } from 'vitest';
/* oxlint-disable no-await-in-loop -- Page traversal and fixture writes retain stable order. */

import {
  startDialogueScenario,
  type DialogueInteraction,
  type DialogueScenario,
} from '../../support/dialogue/dialogue-scenario.js';

describe('Dialogue connection pagination', () => {
  let scenario: DialogueScenario;

  beforeAll(async () => {
    scenario = await startDialogueScenario();
  });

  afterAll(async () => {
    if (scenario !== undefined) {
      await scenario.close();
    }
  }, 30_000);

  test('freezes the dialogue list while new dialogues are created', async () => {
    const baseline = await scenario.client.dialogues(100);
    const first = await scenario.client.createDialogue({ title: 'List snapshot first' });
    const second = await scenario.client.createDialogue({ title: 'List snapshot second' });
    let consumed = 0;
    let page = await scenario.client.dialogues(Math.min(100, baseline.totalCount + 1));
    consumed += page.edges.length;
    while (consumed <= baseline.totalCount - 100) {
      const cursor = page.pageInfo.endCursor;
      if (cursor === undefined) {
        throw new Error('Dialogue list ended before the snapshot boundary.');
      }
      page = await scenario.client.dialogues(100, cursor);
      consumed += page.edges.length;
    }
    if (consumed <= baseline.totalCount) {
      const cursor = page.pageInfo.endCursor;
      if (cursor === undefined) {
        throw new Error('Dialogue list has no cursor before the snapshot boundary.');
      }
      page = await scenario.client.dialogues(baseline.totalCount - consumed + 1, cursor);
      consumed += page.edges.length;
    }
    const endCursor = page.pageInfo.endCursor;
    if (endCursor === undefined) {
      throw new Error('Dialogue list page has no continuation cursor.');
    }
    expect(page).toMatchObject({
      totalCount: baseline.totalCount + 2,
      pageInfo: { hasNextPage: true },
    });
    expect(consumed).toBe(baseline.totalCount + 1);
    expect(page.edges.at(-1)?.node.id).toBe(first.id);

    const later = await scenario.client.createDialogue({ title: 'List snapshot later' });
    const continuation = await scenario.client.dialogues(100, endCursor);
    expect(continuation.snapshotCursor).toBe(page.snapshotCursor);
    expect(continuation.totalCount).toBe(baseline.totalCount + 2);
    expect(continuation.edges.map(({ node }) => node.id)).toEqual([second.id]);
    expect(continuation.edges.some(({ node }) => node.id === later.id)).toBe(false);
  });

  test('freezes turn membership while a later turn is completed', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Turn pagination' });
    const firstTurn = await completeTurn(dialogue.id, 'First turn', 'First answer');
    const secondTurn = await completeTurn(dialogue.id, 'Second turn', 'Second answer');
    const page = await scenario.client.turnsPage(dialogue.id, 1);
    const endCursor = page.pageInfo.endCursor;
    if (endCursor === undefined) {
      throw new Error('Turn page has no continuation cursor.');
    }
    expect(page).toMatchObject({ totalCount: 2, pageInfo: { hasNextPage: true } });
    expect(page.edges.map(({ node }) => node.id)).toEqual([firstTurn]);

    const laterTurn = await completeTurn(dialogue.id, 'Later turn', 'Later answer');
    const continuation = await scenario.client.turnsPage(dialogue.id, 10, endCursor);
    expect(continuation.snapshotCursor).toBe(page.snapshotCursor);
    expect(continuation.totalCount).toBe(2);
    expect(continuation.edges.map(({ node }) => node.id)).toEqual([secondTurn]);
    expect(continuation.edges.some(({ node }) => node.id === laterTurn)).toBe(false);
  });

  test('freezes interaction membership while a later request arrives', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Interaction pagination' });
    const turn = await scenario.client.send(dialogue.id, 'Request paged interactions');
    const execution = await scenario.agent.expectTurn(turn);
    await execution.requestPermission();
    await execution.requestInput();
    await expect.poll(() => scenario.client.interactions(dialogue.id)).toHaveLength(2);

    const page = await scenario.client.interactionsPage(dialogue.id, 1);
    const endCursor = page.pageInfo.endCursor;
    if (endCursor === undefined) {
      throw new Error('Interaction page has no continuation cursor.');
    }
    expect(page).toMatchObject({ totalCount: 2, pageInfo: { hasNextPage: true } });

    await execution.requestPermission();
    await expect.poll(() => scenario.client.interactions(dialogue.id)).toHaveLength(3);
    const continuation = await scenario.client.interactionsPage(dialogue.id, 10, endCursor);
    expect(continuation.snapshotCursor).toBe(page.snapshotCursor);
    expect(continuation.totalCount).toBe(2);
    expect(continuation.edges).toHaveLength(1);
    const snapshottedIds = new Set([
      ...page.edges.map(({ node }) => node.id),
      ...continuation.edges.map(({ node }) => node.id),
    ]);
    const interactions = await scenario.client.interactions(dialogue.id);
    expect(interactions).toHaveLength(3);
    expect(interactions.filter(({ id }) => !snapshottedIds.has(id))).toHaveLength(1);

    for (const interaction of interactions) {
      await respond(interaction, dialogue.id);
    }
    await execution.complete();
    await expect
      .poll(() => scenario.client.dialogue(dialogue.id))
      .toMatchObject({
        status: 'READY',
        lastOutcome: 'COMPLETED',
      });
  });

  test('reads a long injected history in stable pages without loss or late membership', async () => {
    const dialogue = await scenario.client.createDialogue({ title: 'Long history pagination' });
    const expectedIds = Array.from({ length: 250 }, () => crypto.randomUUID());
    await scenario.prisma.$transaction(async (transaction) => {
      await transaction.dialogueHistoryItem.createMany({
        data: expectedIds.map((id, index) => ({
          id,
          dialogueId: dialogue.id,
          sequence: BigInt(index + 1),
          kind: 'CHECKPOINT',
          source: 'SYSTEM',
          text: `Checkpoint ${index + 1}`,
          payload: { index: index + 1 },
          status: 'COMPLETED',
          historical: true,
        })),
      });
      await transaction.dialogue.update({
        where: { id: dialogue.id },
        data: { itemSequence: BigInt(expectedIds.length) },
      });
    });

    const first = await scenario.client.historyPage(dialogue.id, 100);
    expect(first).toMatchObject({ totalCount: 250, pageInfo: { hasNextPage: true } });
    const lateId = crypto.randomUUID();
    await scenario.prisma.$transaction(async (transaction) => {
      await transaction.dialogueHistoryItem.create({
        data: {
          id: lateId,
          dialogueId: dialogue.id,
          sequence: 251n,
          kind: 'CHECKPOINT',
          source: 'SYSTEM',
          text: 'Late checkpoint',
          payload: { index: 251 },
          status: 'COMPLETED',
          historical: true,
        },
      });
      await transaction.dialogue.update({
        where: { id: dialogue.id },
        data: { itemSequence: 251n },
      });
    });

    const ids = first.edges.map(({ node }) => node.id);
    let cursor = first.pageInfo.endCursor;
    while (cursor !== undefined) {
      const page = await scenario.client.historyPage(dialogue.id, 100, cursor);
      expect(page.snapshotCursor).toBe(first.snapshotCursor);
      expect(page.totalCount).toBe(250);
      ids.push(...page.edges.map(({ node }) => node.id));
      cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined;
    }
    expect(ids).toEqual(expectedIds);
    expect(ids).not.toContain(lateId);
  });

  const completeTurn = async (
    dialogueId: string,
    prompt: string,
    answer: string,
  ): Promise<string> => {
    const turn = await scenario.client.send(dialogueId, prompt);
    const execution = await scenario.agent.expectTurn(turn);
    await execution.text(answer);
    await execution.complete();
    await expect
      .poll(() => scenario.client.dialogue(dialogueId))
      .toMatchObject({
        status: 'READY',
        lastOutcome: 'COMPLETED',
      });
    return turn.id;
  };

  const respond = async (interaction: DialogueInteraction, dialogueId: string): Promise<void> => {
    if (interaction.request.kind === 'permission') {
      await scenario.client.respond(dialogueId, interaction.id, crypto.randomUUID(), {
        kind: 'permission',
        outcome: 'selected',
        optionId: 'allow-test-action',
      });
      return;
    }
    await scenario.client.respond(dialogueId, interaction.id, crypto.randomUUID(), {
      kind: 'input',
      outcome: 'submitted',
      values: { answer: 'Pagination response' },
    });
  };
});
