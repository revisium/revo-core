import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentSessionEventAppendResult } from '@revisium/revo-agent-runtime';

import type { DialogueHistoryItem, Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { json } from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import { AgentSessionEventReceiptWriter } from '../../persistence/agent-session-event-receipt.js';
import {
  CompleteDialogueAssistantMessageCommand,
  type CompleteDialogueAssistantMessageCommandReturnType,
} from '../impl/complete-dialogue-assistant-message.command.js';

@Injectable()
@CommandHandler(CompleteDialogueAssistantMessageCommand)
export class CompleteDialogueAssistantMessageHandler implements ICommandHandler<
  CompleteDialogueAssistantMessageCommand,
  CompleteDialogueAssistantMessageCommandReturnType
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
  }: CompleteDialogueAssistantMessageCommand): Promise<AgentSessionEventAppendResult> {
    signal.throwIfAborted();

    return this.transactions.runReadCommitted(async () => {
      const receipt = await this.receipts.append(event, expected, signal);

      if (receipt.state !== 'stored') {
        return receipt.result;
      }

      if (receipt.dialogueId !== null && (await this.isActiveTurn(receipt.dialogueId, event))) {
        await this.completeText(receipt.dialogueId, event);
      }

      return { state: 'appended' };
    });
  }

  private async isActiveTurn(
    dialogueId: string,
    event: CompleteDialogueAssistantMessageCommand['data']['event'],
  ): Promise<boolean> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true, runtimeSessionId: true },
    });

    return dialogue?.runtimeSessionId === event.sessionId && dialogue.activeTurnId === event.turnId;
  }

  private async completeText(
    dialogueId: string,
    event: CompleteDialogueAssistantMessageCommand['data']['event'],
  ): Promise<void> {
    const itemId = `${dialogueId}:${event.turnId}:assistant`;
    const item = await this.getOrCreateAssistantMessage(dialogueId, event.turnId);
    this.validateCompletion(item.text, event.contentBytes, event.contentSha256);
    const updated = await this.completeAssistantMessage(itemId, event);

    await this.changes.append(dialogueId, {
      kind: 'HISTORY_ITEM_UPSERTED',
      itemId,
      itemVersion: updated.version,
      itemSequence: updated.sequence,
      turnId: event.turnId,
      itemKind: 'MESSAGE',
      itemSource: 'AGENT',
    });
  }

  private async getOrCreateAssistantMessage(
    dialogueId: string,
    turnId: string,
  ): Promise<DialogueHistoryItem> {
    const itemId = `${dialogueId}:${turnId}:assistant`;
    const item = await this.transaction.dialogueHistoryItem.findUnique({ where: { id: itemId } });

    if (item !== null) {
      return item;
    }

    const sequence = await this.reserveItemSequence(dialogueId);

    return this.createAssistantMessage(dialogueId, turnId, sequence);
  }

  private async reserveItemSequence(dialogueId: string): Promise<bigint> {
    const dialogue = await this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { itemSequence: { increment: 1 } },
    });

    return dialogue.itemSequence;
  }

  private createAssistantMessage(dialogueId: string, turnId: string, sequence: bigint) {
    return this.transaction.dialogueHistoryItem.create({
      data: {
        id: `${dialogueId}:${turnId}:assistant`,
        dialogueId,
        sequence,
        turnId,
        sourceKey: `assistant:${turnId}`,
        kind: 'MESSAGE',
        source: 'AGENT',
        text: '',
        status: 'STREAMING',
        version: 0n,
      },
    });
  }

  private validateCompletion(text: string, contentBytes: number, contentSha256: string): void {
    const bytes = Buffer.byteLength(text, 'utf8');
    const digest = createHash('sha256').update(text, 'utf8').digest('hex');

    if (bytes !== contentBytes || digest !== contentSha256) {
      throw new Error('Assistant completion does not match the persisted text.');
    }
  }

  private completeAssistantMessage(
    itemId: string,
    event: CompleteDialogueAssistantMessageCommand['data']['event'],
  ) {
    return this.transaction.dialogueHistoryItem.update({
      where: { id: itemId },
      data: { status: 'COMPLETED', version: { increment: 1 }, payload: json(event) },
    });
  }
}
