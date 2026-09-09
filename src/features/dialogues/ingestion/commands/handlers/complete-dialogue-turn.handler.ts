/* oxlint-disable no-await-in-loop -- Projection changes must retain durable feed order. */

import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type {
  AgentSessionEventAppendResult,
  AgentSessionTurnOutcome,
} from '@revisium/revo-agent-runtime';

import type { DialogueHistoryItem, Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { DialogueInteractionCleanup } from '../../../../../infrastructure/dialogue/dialogue-interaction-cleanup.js';
import {
  compareHistoryItemSequence,
  json,
} from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import { AgentSessionEventReceiptWriter } from '../../persistence/agent-session-event-receipt.js';
import {
  CompleteDialogueTurnCommand,
  type CompleteDialogueTurnCommandReturnType,
} from '../impl/complete-dialogue-turn.command.js';

type TurnCompletionEvent = CompleteDialogueTurnCommand['data']['event'];
type ProjectedTurnOutcome = 'COMPLETED' | 'CANCELLED' | 'INTERRUPTED' | 'FAILED';

@Injectable()
@CommandHandler(CompleteDialogueTurnCommand)
export class CompleteDialogueTurnHandler implements ICommandHandler<
  CompleteDialogueTurnCommand,
  CompleteDialogueTurnCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly receipts: AgentSessionEventReceiptWriter,
    private readonly changes: DialogueChangePublisher,
    private readonly interactions: DialogueInteractionCleanup,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({
    data: { event, expected, signal },
  }: CompleteDialogueTurnCommand): Promise<AgentSessionEventAppendResult> {
    signal.throwIfAborted();

    return this.transactions.runReadCommitted(async () => {
      const receipt = await this.receipts.append(event, expected, signal);

      if (receipt.state !== 'stored') {
        return receipt.result;
      }

      if (receipt.dialogueId !== null && (await this.isActiveTurn(receipt.dialogueId, event))) {
        await this.completeTurn(receipt.dialogueId, event);
      }

      return { state: 'appended' };
    });
  }

  private async isActiveTurn(dialogueId: string, event: TurnCompletionEvent): Promise<boolean> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true, runtimeSessionId: true },
    });

    return dialogue?.runtimeSessionId === event.sessionId && dialogue.activeTurnId === event.turnId;
  }

  private async completeTurn(dialogueId: string, event: TurnCompletionEvent): Promise<void> {
    await this.markStreamingAssistantPartial(dialogueId, event.turnId);
    const interrupted = await this.interruptTurnActivities(dialogueId, event.turnId);
    const abandoned = await this.interactions.abandon(dialogueId, {
      kind: 'turn',
      turnId: event.turnId,
    });
    const finalized = [...interrupted, ...abandoned].sort(compareHistoryItemSequence);
    const remainingInteractions = await this.countPendingInteractions(dialogueId);
    const resultSequence = await this.reserveItemSequence(dialogueId);
    const outcome = this.turnOutcome(event);
    const publicOutcome = this.publicTurnOutcome(event.outcome);
    const resultId = `${dialogueId}:${event.turnId}:result`;
    await this.createTurnResult(
      resultId,
      dialogueId,
      event,
      resultSequence,
      outcome,
      publicOutcome,
    );
    await this.finishTurn(dialogueId, event, resultSequence, outcome, publicOutcome);
    await this.finishDialogue(dialogueId, remainingInteractions, outcome);

    for (const item of finalized) {
      await this.publishHistoryItem(dialogueId, item);
    }

    await this.changes.append(dialogueId, {
      kind: 'HISTORY_ITEM_UPSERTED',
      itemId: resultId,
      itemVersion: 0n,
      itemSequence: resultSequence,
      turnId: event.turnId,
      itemKind: 'RESULT',
      itemSource: 'SYSTEM',
    });
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }

  private async markStreamingAssistantPartial(dialogueId: string, turnId: string): Promise<void> {
    const assistant = await this.findHistoryItem(`${dialogueId}:${turnId}:assistant`);

    if (assistant?.status !== 'STREAMING') {
      return;
    }

    const partial = await this.markHistoryItemPartial(assistant.id);
    await this.publishHistoryItem(dialogueId, partial);
  }

  private findHistoryItem(itemId: string) {
    return this.transaction.dialogueHistoryItem.findUnique({ where: { id: itemId } });
  }

  private markHistoryItemPartial(itemId: string) {
    return this.transaction.dialogueHistoryItem.update({
      where: { id: itemId },
      data: { status: 'PARTIAL', version: { increment: 1 } },
    });
  }

  private async interruptTurnActivities(
    dialogueId: string,
    turnId: string,
  ): Promise<DialogueHistoryItem[]> {
    const unfinished = await this.findUnfinishedActivities(dialogueId, turnId);

    return Promise.all(unfinished.map(({ id }) => this.markHistoryItemInterrupted(id)));
  }

  private findUnfinishedActivities(dialogueId: string, turnId: string) {
    return this.transaction.dialogueHistoryItem.findMany({
      where: {
        dialogueId,
        turnId,
        historical: false,
        kind: { notIn: ['MESSAGE', 'INTERACTION'] },
        status: { in: ['STARTED', 'IN_PROGRESS'] },
      },
      orderBy: { sequence: 'asc' },
    });
  }

  private markHistoryItemInterrupted(itemId: string) {
    return this.transaction.dialogueHistoryItem.update({
      where: { id: itemId },
      data: { status: 'INTERRUPTED', version: { increment: 1 } },
    });
  }

  private countPendingInteractions(dialogueId: string): Promise<number> {
    return this.transaction.dialogueInteraction.count({
      where: { dialogueId, status: { in: ['PENDING', 'RESPONDING'] } },
    });
  }

  private async reserveItemSequence(dialogueId: string): Promise<bigint> {
    const dialogue = await this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { itemSequence: { increment: 1 } },
    });

    return dialogue.itemSequence;
  }

  private turnOutcome(event: TurnCompletionEvent): ProjectedTurnOutcome {
    if (event.outcome.status === 'completed') {
      return 'COMPLETED';
    }

    if (event.outcome.status === 'cancelled') {
      return 'CANCELLED';
    }

    if (event.outcome.status === 'interrupted' || event.outcome.status === 'timed_out') {
      return 'INTERRUPTED';
    }

    return 'FAILED';
  }

  private publicTurnOutcome(outcome: AgentSessionTurnOutcome): AgentSessionTurnOutcome {
    if (outcome.status !== 'failed') {
      return outcome;
    }

    return {
      status: 'failed',
      error: {
        code: outcome.error.code,
        message: 'Agent turn failed.',
        phase: outcome.error.phase,
        retryable: outcome.error.retryable,
      },
    };
  }

  private createTurnResult(
    resultId: string,
    dialogueId: string,
    event: TurnCompletionEvent,
    sequence: bigint,
    outcome: ProjectedTurnOutcome,
    publicOutcome: AgentSessionTurnOutcome,
  ) {
    return this.transaction.dialogueHistoryItem.create({
      data: {
        id: resultId,
        dialogueId,
        sequence,
        turnId: event.turnId,
        sourceKey: `result:${event.turnId}`,
        kind: 'RESULT',
        source: 'SYSTEM',
        payload: json(publicOutcome),
        status: outcome,
      },
    });
  }

  private finishTurn(
    dialogueId: string,
    event: TurnCompletionEvent,
    endItemSequence: bigint,
    outcome: ProjectedTurnOutcome,
    publicOutcome: AgentSessionTurnOutcome,
  ) {
    return this.transaction.dialogueTurn.updateMany({
      where: { id: event.turnId, dialogueId },
      data: {
        status: outcome,
        dispatchState: 'FINISHED',
        outcome: json(publicOutcome),
        completedAt: new Date(event.observedAt),
        endItemSequence,
      },
    });
  }

  private finishDialogue(dialogueId: string, pendingCount: number, outcome: ProjectedTurnOutcome) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: pendingCount > 0 ? 'WAITING' : 'READY',
        activeTurnId: null,
        pendingCount,
        progress: '',
        lastOutcome: outcome,
        significantSequence: { increment: 1 },
        version: { increment: 1 },
      },
    });
  }

  private async publishHistoryItem(dialogueId: string, item: DialogueHistoryItem): Promise<void> {
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
