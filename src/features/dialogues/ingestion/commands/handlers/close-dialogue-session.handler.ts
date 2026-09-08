/* oxlint-disable no-await-in-loop -- Projection changes must retain durable feed order. */

import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentSessionEventAppendResult } from '@revisium/revo-agent-runtime';

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
  CloseDialogueSessionCommand,
  type CloseDialogueSessionCommandReturnType,
} from '../impl/close-dialogue-session.command.js';

type SessionClosedEvent = CloseDialogueSessionCommand['data']['event'];

@Injectable()
@CommandHandler(CloseDialogueSessionCommand)
export class CloseDialogueSessionHandler implements ICommandHandler<
  CloseDialogueSessionCommand,
  CloseDialogueSessionCommandReturnType
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
  }: CloseDialogueSessionCommand): Promise<AgentSessionEventAppendResult> {
    signal.throwIfAborted();

    return this.transactions.runReadCommitted(async () => {
      const receipt = await this.receipts.append(event, expected, signal);

      if (receipt.state !== 'stored') {
        return receipt.result;
      }

      if (receipt.dialogueId !== null && (await this.isActiveSession(receipt.dialogueId, event))) {
        await this.closeSession(receipt.dialogueId, event);
      }

      return { state: 'appended' };
    });
  }

  private async isActiveSession(dialogueId: string, event: SessionClosedEvent): Promise<boolean> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { runtimeSessionId: true },
    });

    return dialogue?.runtimeSessionId === event.sessionId;
  }

  private async closeSession(dialogueId: string, event: SessionClosedEvent): Promise<void> {
    const dialogue = await this.findDialogue(dialogueId);

    if (dialogue === null) {
      return;
    }

    if (dialogue.activeTurnId === null) {
      await this.closeIdleSession(dialogueId);

      return;
    }

    await this.closeActiveSession(dialogueId, dialogue.activeTurnId, event);
  }

  private async closeIdleSession(dialogueId: string): Promise<void> {
    const abandonedItems = await this.interactions.abandon(dialogueId, { kind: 'all' });
    await this.detachIdleSession(dialogueId, abandonedItems.length > 0);

    for (const item of abandonedItems) {
      await this.publishHistoryItem(dialogueId, item);
    }

    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }

  private async closeActiveSession(
    dialogueId: string,
    turnId: string,
    event: SessionClosedEvent,
  ): Promise<void> {
    const outcome = event.outcome === 'cancelled' ? 'CANCELLED' : 'FAILED';
    await this.markStreamingAssistantPartial(dialogueId, turnId);
    const result = await this.createResult(dialogueId, turnId, event, outcome);
    await this.finishTurn(dialogueId, turnId, event, result.sequence, outcome);
    const abandoned = await this.interactions.abandon(dialogueId, { kind: 'all' });
    const interrupted = await this.interruptActivities(dialogueId);
    interrupted.push(...abandoned);
    interrupted.sort(compareHistoryItemSequence);
    await this.finishDialogue(dialogueId, outcome);
    await this.publishHistoryItem(dialogueId, result);

    for (const item of interrupted) {
      await this.publishHistoryItem(dialogueId, item);
    }

    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }

  private findDialogue(dialogueId: string) {
    return this.transaction.dialogue.findUnique({ where: { id: dialogueId } });
  }

  private detachIdleSession(dialogueId: string, abandonedInteractions: boolean) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: 'READY',
        runtimeSessionId: null,
        pendingCount: 0,
        contextMode: 'CONTINUED',
        ...(abandonedInteractions ? { significantSequence: { increment: 1 } } : {}),
        version: { increment: 1 },
      },
    });
  }

  private async markStreamingAssistantPartial(dialogueId: string, turnId: string): Promise<void> {
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
    await this.publishHistoryItem(dialogueId, partial);
  }

  private async createResult(
    dialogueId: string,
    turnId: string,
    event: SessionClosedEvent,
    outcome: 'CANCELLED' | 'FAILED',
  ): Promise<DialogueHistoryItem> {
    const sequence = await this.reserveItemSequence(dialogueId);

    return this.transaction.dialogueHistoryItem.create({
      data: {
        id: `${dialogueId}:result:${turnId}`,
        dialogueId,
        sequence,
        turnId,
        sourceKey: `result:${turnId}`,
        kind: 'RESULT',
        source: 'SYSTEM',
        text: '',
        status: outcome,
        payload: json(event),
      },
    });
  }

  private async reserveItemSequence(dialogueId: string): Promise<bigint> {
    const dialogue = await this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { itemSequence: { increment: 1 } },
    });

    return dialogue.itemSequence;
  }

  private finishTurn(
    dialogueId: string,
    turnId: string,
    event: SessionClosedEvent,
    endItemSequence: bigint,
    outcome: 'CANCELLED' | 'FAILED',
  ) {
    return this.transaction.dialogueTurn.updateMany({
      where: { id: turnId, dialogueId, dispatchState: { not: 'FINISHED' } },
      data: {
        status: outcome,
        dispatchState: 'FINISHED',
        outcome: json(event),
        completedAt: new Date(event.observedAt),
        endItemSequence,
      },
    });
  }

  private async interruptActivities(dialogueId: string): Promise<DialogueHistoryItem[]> {
    const unfinished = await this.transaction.dialogueHistoryItem.findMany({
      where: {
        dialogueId,
        historical: false,
        kind: { notIn: ['MESSAGE', 'INTERACTION'] },
        status: { in: ['STARTED', 'IN_PROGRESS'] },
      },
      orderBy: { sequence: 'asc' },
    });

    return Promise.all(
      unfinished.map(({ id }) =>
        this.transaction.dialogueHistoryItem.update({
          where: { id },
          data: { status: 'INTERRUPTED', version: { increment: 1 } },
        }),
      ),
    );
  }

  private finishDialogue(dialogueId: string, outcome: 'CANCELLED' | 'FAILED') {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: 'READY',
        runtimeSessionId: null,
        activeTurnId: null,
        pendingCount: 0,
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
