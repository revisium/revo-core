/* oxlint-disable no-await-in-loop -- Changes must retain durable feed order. */

import { Injectable } from '@nestjs/common';

import type { DialogueHistoryItem, Prisma } from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { DialogueInteractionCleanup } from '../../../../infrastructure/dialogue/dialogue-interaction-cleanup.js';
import { json } from '../../../../infrastructure/dialogue/dialogue-persistence.js';
import type { DialogueJson } from '../contracts/dialogue.contracts.js';

@Injectable()
export class DialogueTurnFinalizer {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
    private readonly interactions: DialogueInteractionCleanup,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async finishWithoutRuntime(
    dialogueId: string,
    turnId: string,
    outcome: 'CANCELLED' | 'FAILED' | 'UNCERTAIN',
    payload: DialogueJson,
  ): Promise<void> {
    const resultSequence = await this.reserveResultSequence(dialogueId);
    await this.markAssistantPartial(dialogueId, turnId);
    const interruptedItems = await this.interruptTurnItems(dialogueId, turnId);
    const result = await this.createResult(dialogueId, turnId, resultSequence, outcome, payload);
    await this.finishTurn(turnId, outcome, payload, result.sequence);
    const abandonedItems = await this.interactions.abandon(dialogueId, { kind: 'all' });
    interruptedItems.push(...abandonedItems);
    interruptedItems.sort((left, right) =>
      left.sequence < right.sequence ? -1 : left.sequence > right.sequence ? 1 : 0,
    );
    await this.finishDialogue(dialogueId, outcome);

    for (const item of interruptedItems) {
      await this.publishItem(dialogueId, item);
    }
    await this.publishItem(dialogueId, result);
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }

  private async reserveResultSequence(dialogueId: string): Promise<bigint> {
    const dialogue = await this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { itemSequence: { increment: 1 } },
    });

    return dialogue.itemSequence;
  }

  private createResult(
    dialogueId: string,
    turnId: string,
    sequence: bigint,
    outcome: 'CANCELLED' | 'FAILED' | 'UNCERTAIN',
    payload: DialogueJson,
  ) {
    return this.transaction.dialogueHistoryItem.create({
      data: {
        id: `${dialogueId}:${turnId}:result`,
        dialogueId,
        sequence,
        turnId,
        sourceKey: `result:${turnId}`,
        kind: 'RESULT',
        source: 'SYSTEM',
        status: outcome === 'UNCERTAIN' ? 'INTERRUPTED' : outcome,
        payload: json(payload),
      },
    });
  }

  private finishTurn(
    turnId: string,
    outcome: 'CANCELLED' | 'FAILED' | 'UNCERTAIN',
    payload: DialogueJson,
    endItemSequence: bigint,
  ) {
    return this.transaction.dialogueTurn.update({
      where: { id: turnId },
      data: {
        status: outcome,
        dispatchState: outcome === 'UNCERTAIN' ? 'UNCERTAIN' : 'FINISHED',
        completedAt: new Date(),
        endItemSequence,
        outcome: json(payload),
      },
    });
  }

  private finishDialogue(dialogueId: string, outcome: 'CANCELLED' | 'FAILED' | 'UNCERTAIN') {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: outcome === 'UNCERTAIN' ? 'UNCERTAIN' : 'READY',
        activeTurnId: null,
        runtimeSessionId: null,
        pendingCount: 0,
        progress: '',
        lastOutcome: outcome,
        significantSequence: { increment: 1 },
        version: { increment: 1 },
      },
    });
  }

  private async markAssistantPartial(dialogueId: string, turnId: string): Promise<void> {
    const assistant = await this.transaction.dialogueHistoryItem.findUnique({
      where: { id: `${dialogueId}:${turnId}:assistant` },
    });

    if (assistant?.status !== 'STREAMING') {
      return;
    }
    const partial = await this.transaction.dialogueHistoryItem.update({
      where: { id: assistant.id },
      data: { status: 'PARTIAL', version: { increment: 1 } },
    });
    await this.publishItem(dialogueId, partial);
  }

  private async interruptTurnItems(dialogueId: string, turnId: string) {
    const unfinished = await this.transaction.dialogueHistoryItem.findMany({
      where: {
        dialogueId,
        historical: false,
        turnId,
        kind: { notIn: ['MESSAGE', 'INTERACTION'] },
        status: { in: ['STARTED', 'IN_PROGRESS'] },
      },
      orderBy: { sequence: 'asc' },
    });

    return Promise.all(
      unfinished.map((item) =>
        this.transaction.dialogueHistoryItem.update({
          where: { id: item.id },
          data: { status: 'INTERRUPTED', version: { increment: 1 } },
        }),
      ),
    );
  }

  private async publishItem(dialogueId: string, item: DialogueHistoryItem): Promise<void> {
    await this.changes.append(dialogueId, {
      kind: 'HISTORY_ITEM_UPSERTED',
      itemId: item.id,
      itemVersion: item.version,
      itemSequence: item.sequence,
      ...(item.turnId === null ? {} : { turnId: item.turnId }),
      itemKind: item.kind,
      itemSource: item.source,
    });
  }
}
