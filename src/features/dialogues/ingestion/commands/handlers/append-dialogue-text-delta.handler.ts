import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentSessionEventAppendResult } from '@revisium/revo-agent-runtime';

import type { Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import {
  DialogueChangePublisher,
  type DialogueChangeData,
} from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { AgentSessionEventReceiptWriter } from '../../persistence/agent-session-event-receipt.js';
import {
  AppendDialogueTextDeltaCommand,
  type AppendDialogueTextDeltaCommandReturnType,
} from '../impl/append-dialogue-text-delta.command.js';

@Injectable()
@CommandHandler(AppendDialogueTextDeltaCommand)
export class AppendDialogueTextDeltaHandler implements ICommandHandler<
  AppendDialogueTextDeltaCommand,
  AppendDialogueTextDeltaCommandReturnType
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
  }: AppendDialogueTextDeltaCommand): Promise<AgentSessionEventAppendResult> {
    signal.throwIfAborted();

    return this.transactions.runReadCommitted(async () => {
      const receipt = await this.receipts.append(event, expected, signal);

      if (receipt.state !== 'stored') {
        return receipt.result;
      }

      if (receipt.dialogueId !== null && (await this.isActiveTurn(receipt.dialogueId, event))) {
        await this.appendText(receipt.dialogueId, event.turnId, event.content);
      }

      return { state: 'appended' };
    });
  }

  private async isActiveTurn(
    dialogueId: string,
    event: AppendDialogueTextDeltaCommand['data']['event'],
  ): Promise<boolean> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true, runtimeSessionId: true },
    });

    return dialogue?.runtimeSessionId === event.sessionId && dialogue.activeTurnId === event.turnId;
  }

  private async appendText(dialogueId: string, turnId: string, content: string): Promise<void> {
    const itemId = `${dialogueId}:${turnId}:assistant`;
    const existing = await this.findAssistantMessage(itemId);
    let itemSequence: bigint;
    let version: bigint;

    if (existing === null) {
      itemSequence = await this.reserveItemSequence(dialogueId);
      version = 1n;
      await this.createAssistantMessage(dialogueId, turnId, itemSequence, content, version);
    } else {
      itemSequence = existing.sequence;
      version = existing.version + 1n;
      await this.appendAssistantContent(itemId, existing.text, content, version);
    }

    await this.publishDelta(dialogueId, {
      kind: 'HISTORY_TEXT_APPENDED',
      itemId,
      itemVersion: version,
      baseItemVersion: version - 1n,
      itemSequence,
      turnId,
      itemKind: 'MESSAGE',
      itemSource: 'AGENT',
      textDelta: content,
    });
  }

  private findAssistantMessage(itemId: string) {
    return this.transaction.dialogueHistoryItem.findUnique({ where: { id: itemId } });
  }

  private async reserveItemSequence(dialogueId: string): Promise<bigint> {
    const dialogue = await this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { itemSequence: { increment: 1 } },
    });

    return dialogue.itemSequence;
  }

  private createAssistantMessage(
    dialogueId: string,
    turnId: string,
    sequence: bigint,
    text: string,
    version: bigint,
  ) {
    return this.transaction.dialogueHistoryItem.create({
      data: {
        id: `${dialogueId}:${turnId}:assistant`,
        dialogueId,
        sequence,
        turnId,
        sourceKey: `assistant:${turnId}`,
        kind: 'MESSAGE',
        source: 'AGENT',
        text,
        status: 'STREAMING',
        version,
      },
    });
  }

  private appendAssistantContent(
    itemId: string,
    currentText: string,
    content: string,
    version: bigint,
  ) {
    return this.transaction.dialogueHistoryItem.update({
      where: { id: itemId },
      data: { text: currentText + content, version },
    });
  }

  private async publishDelta(dialogueId: string, data: DialogueChangeData): Promise<void> {
    await this.changes.append(dialogueId, data);
  }
}
