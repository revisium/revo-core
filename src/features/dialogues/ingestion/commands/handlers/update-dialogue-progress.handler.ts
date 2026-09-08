import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentSessionEventAppendResult } from '@revisium/revo-agent-runtime';

import type { Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { AgentSessionEventReceiptWriter } from '../../persistence/agent-session-event-receipt.js';
import {
  UpdateDialogueProgressCommand,
  type UpdateDialogueProgressCommandReturnType,
} from '../impl/update-dialogue-progress.command.js';

@Injectable()
@CommandHandler(UpdateDialogueProgressCommand)
export class UpdateDialogueProgressHandler implements ICommandHandler<
  UpdateDialogueProgressCommand,
  UpdateDialogueProgressCommandReturnType
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
  }: UpdateDialogueProgressCommand): Promise<AgentSessionEventAppendResult> {
    signal.throwIfAborted();

    return this.transactions.runReadCommitted(async () => {
      const receipt = await this.receipts.append(event, expected, signal);

      if (receipt.state !== 'stored') {
        return receipt.result;
      }

      if (receipt.dialogueId !== null && (await this.isActiveTurn(receipt.dialogueId, event))) {
        await this.updateProgress(receipt.dialogueId, event.message);
      }

      return { state: 'appended' };
    });
  }

  private async isActiveTurn(
    dialogueId: string,
    event: UpdateDialogueProgressCommand['data']['event'],
  ): Promise<boolean> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true, runtimeSessionId: true },
    });

    return dialogue?.runtimeSessionId === event.sessionId && dialogue.activeTurnId === event.turnId;
  }

  private async updateProgress(dialogueId: string, message: string): Promise<void> {
    await this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { progress: message, version: { increment: 1 } },
    });
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }
}
