import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentSessionEventAppendResult } from '@revisium/revo-agent-runtime';

import type { DialogueHistoryItem, Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { json } from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import { AgentSessionEventReceiptWriter } from '../../persistence/agent-session-event-receipt.js';
import {
  RequestDialogueInteractionCommand,
  type RequestDialogueInteractionCommandReturnType,
} from '../impl/request-dialogue-interaction.command.js';

@Injectable()
@CommandHandler(RequestDialogueInteractionCommand)
export class RequestDialogueInteractionHandler implements ICommandHandler<
  RequestDialogueInteractionCommand,
  RequestDialogueInteractionCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly receipts: AgentSessionEventReceiptWriter,
    private readonly changes: DialogueChangePublisher,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({
    data: { event, expected, signal },
  }: RequestDialogueInteractionCommand): Promise<AgentSessionEventAppendResult> {
    signal.throwIfAborted();

    return this.transactions.runReadCommitted(async () => {
      const receipt = await this.receipts.append(event, expected, signal);

      if (receipt.state !== 'stored') {
        return receipt.result;
      }

      if (receipt.dialogueId !== null && (await this.isActiveScope(receipt.dialogueId, event))) {
        await this.requestInteraction(receipt.dialogueId, event);
      }

      return { state: 'appended' };
    });
  }

  private async isActiveScope(
    dialogueId: string,
    event: RequestDialogueInteractionCommand['data']['event'],
  ): Promise<boolean> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true, runtimeSessionId: true },
    });

    if (dialogue?.runtimeSessionId !== event.sessionId) {
      return false;
    }

    return event.scope.kind !== 'turn' || dialogue.activeTurnId === event.scope.turnId;
  }

  private async requestInteraction(
    dialogueId: string,
    event: RequestDialogueInteractionCommand['data']['event'],
  ): Promise<void> {
    const turnId = event.scope.kind === 'turn' ? event.scope.turnId : null;
    const interactionId = `${event.sessionId}:${event.request.requestId}`;
    await this.createInteraction(dialogueId, interactionId, turnId, event);
    const item = await this.createHistoryItem(dialogueId, interactionId, turnId, event);
    await this.markDialogueWaiting(dialogueId);

    if (turnId !== null) {
      await this.markTurnWaiting(dialogueId, turnId);
    }

    await this.publishInteraction(dialogueId, item);
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }

  private createInteraction(
    dialogueId: string,
    interactionId: string,
    turnId: string | null,
    event: RequestDialogueInteractionCommand['data']['event'],
  ) {
    return this.transaction.dialogueInteraction.create({
      data: {
        id: interactionId,
        dialogueId,
        turnId,
        runtimeSessionId: event.sessionId,
        runtimeRequestId: event.request.requestId,
        request: json(event.request),
      },
    });
  }

  private async createHistoryItem(
    dialogueId: string,
    interactionId: string,
    turnId: string | null,
    event: RequestDialogueInteractionCommand['data']['event'],
  ): Promise<DialogueHistoryItem> {
    const sequence = await this.reserveItemSequence(dialogueId);

    return this.transaction.dialogueHistoryItem.create({
      data: {
        id: `${dialogueId}:${interactionId}`,
        dialogueId,
        sequence,
        turnId,
        sourceKey: interactionId,
        kind: 'INTERACTION',
        source: 'AGENT',
        text: '',
        status: 'PENDING',
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

  private markDialogueWaiting(dialogueId: string) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: 'WAITING',
        pendingCount: { increment: 1 },
        significantSequence: { increment: 1 },
        version: { increment: 1 },
      },
    });
  }

  private markTurnWaiting(dialogueId: string, turnId: string) {
    return this.transaction.dialogueTurn.updateMany({
      where: { id: turnId, dialogueId },
      data: { status: 'WAITING' },
    });
  }

  private async publishInteraction(dialogueId: string, item: DialogueHistoryItem): Promise<void> {
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
