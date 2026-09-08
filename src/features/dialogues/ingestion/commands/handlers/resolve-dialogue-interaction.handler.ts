import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentSessionEventAppendResult } from '@revisium/revo-agent-runtime';

import type { DialogueHistoryItem, Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { json } from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import { AgentSessionEventReceiptWriter } from '../../persistence/agent-session-event-receipt.js';
import {
  ResolveDialogueInteractionCommand,
  type ResolveDialogueInteractionCommandReturnType,
} from '../impl/resolve-dialogue-interaction.command.js';

@Injectable()
@CommandHandler(ResolveDialogueInteractionCommand)
export class ResolveDialogueInteractionHandler implements ICommandHandler<
  ResolveDialogueInteractionCommand,
  ResolveDialogueInteractionCommandReturnType
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
  }: ResolveDialogueInteractionCommand): Promise<AgentSessionEventAppendResult> {
    signal.throwIfAborted();

    return this.transactions.runReadCommitted(async () => {
      const receipt = await this.receipts.append(event, expected, signal);

      if (receipt.state !== 'stored') {
        return receipt.result;
      }

      if (receipt.dialogueId !== null && (await this.isActiveSession(receipt.dialogueId, event))) {
        await this.resolveInteraction(receipt.dialogueId, event);
      }

      return { state: 'appended' };
    });
  }

  private async isActiveSession(
    dialogueId: string,
    event: ResolveDialogueInteractionCommand['data']['event'],
  ): Promise<boolean> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { runtimeSessionId: true },
    });

    return dialogue?.runtimeSessionId === event.sessionId;
  }

  private async resolveInteraction(
    dialogueId: string,
    event: ResolveDialogueInteractionCommand['data']['event'],
  ): Promise<void> {
    const interactionId = `${event.sessionId}:${event.requestId}`;
    const interaction = await this.findInteraction(interactionId);

    if (
      interaction === null ||
      interaction.status === 'RESOLVED' ||
      interaction.status === 'ABANDONED'
    ) {
      return;
    }

    await this.markInteractionResolved(interactionId, event.response);
    const item = await this.resolveInteractionHistory(
      dialogueId,
      interactionId,
      interaction.request,
      event.response,
    );
    const remaining = await this.countPendingInteractions(dialogueId, interactionId);
    const activeTurnId = await this.getActiveTurnId(dialogueId);
    await this.updateDialogueAfterInteraction(dialogueId, activeTurnId, remaining);

    if (interaction.turnId !== null) {
      await this.updateTurnAfterInteraction(dialogueId, interaction.turnId, interactionId);
    }

    await this.publishInteraction(dialogueId, item);
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }

  private findInteraction(interactionId: string) {
    return this.transaction.dialogueInteraction.findUnique({ where: { id: interactionId } });
  }

  private markInteractionResolved(interactionId: string, response: unknown) {
    return this.transaction.dialogueInteraction.update({
      where: { id: interactionId },
      data: { status: 'RESOLVED', response: json(response) },
    });
  }

  private resolveInteractionHistory(
    dialogueId: string,
    interactionId: string,
    request: Prisma.JsonValue,
    response: unknown,
  ) {
    return this.transaction.dialogueHistoryItem.update({
      where: { dialogueId_sourceKey: { dialogueId, sourceKey: interactionId } },
      data: {
        status: 'RESOLVED',
        payload: json({ request, response }),
        version: { increment: 1 },
      },
    });
  }

  private countPendingInteractions(dialogueId: string, excludedId: string): Promise<number> {
    return this.transaction.dialogueInteraction.count({
      where: {
        dialogueId,
        id: { not: excludedId },
        status: { in: ['PENDING', 'RESPONDING'] },
      },
    });
  }

  private async getActiveTurnId(dialogueId: string): Promise<string | null | undefined> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true },
    });

    return dialogue?.activeTurnId;
  }

  private updateDialogueAfterInteraction(
    dialogueId: string,
    activeTurnId: string | null | undefined,
    pendingCount: number,
  ) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: this.dialogueStatus(activeTurnId, pendingCount),
        pendingCount,
        significantSequence: { increment: 1 },
        version: { increment: 1 },
      },
    });
  }

  private dialogueStatus(
    activeTurnId: string | null | undefined,
    pendingCount: number,
  ): 'WAITING' | 'READY' | 'RUNNING' {
    if (pendingCount > 0) {
      return 'WAITING';
    }

    return activeTurnId === null ? 'READY' : 'RUNNING';
  }

  private async updateTurnAfterInteraction(
    dialogueId: string,
    turnId: string,
    interactionId: string,
  ): Promise<void> {
    const remaining = await this.countTurnInteractions(dialogueId, turnId, interactionId);

    await this.transaction.dialogueTurn.updateMany({
      where: { id: turnId, dialogueId, dispatchState: { not: 'FINISHED' } },
      data: { status: remaining > 0 ? 'WAITING' : 'RUNNING' },
    });
  }

  private countTurnInteractions(
    dialogueId: string,
    turnId: string,
    excludedId: string,
  ): Promise<number> {
    return this.transaction.dialogueInteraction.count({
      where: {
        dialogueId,
        turnId,
        id: { not: excludedId },
        status: { in: ['PENDING', 'RESPONDING'] },
      },
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
