import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { dialogueSummaryView } from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import {
  MarkDialogueReadCommand,
  type MarkDialogueReadCommandReturnType,
} from '../impl/mark-dialogue-read.command.js';

@CommandHandler(MarkDialogueReadCommand)
export class MarkDialogueReadHandler implements ICommandHandler<
  MarkDialogueReadCommand,
  MarkDialogueReadCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({ data }: MarkDialogueReadCommand): Promise<MarkDialogueReadCommandReturnType> {
    if (!/^\d+$/.test(data.through)) {
      throw new BadRequestException('Invalid read watermark.');
    }

    return this.transactions.runReadCommitted(() =>
      this.markRead(data.dialogueId, BigInt(data.through)),
    );
  }

  private async markRead(
    dialogueId: string,
    through: bigint,
  ): Promise<MarkDialogueReadCommandReturnType> {
    await this.changes.lockWriter();
    const dialogue = await this.getDialogue(dialogueId);

    if (through > dialogue.significantSequence) {
      throw new ConflictException('Read watermark exceeds the current significant sequence.');
    }

    if (through <= dialogue.readSignificantSequence) {
      return dialogueSummaryView(dialogue);
    }
    const updated = await this.advanceReadWatermark(dialogueId, through);
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });

    return dialogueSummaryView(updated);
  }

  private async getDialogue(dialogueId: string) {
    const dialogue = await this.transaction.dialogue.findUnique({ where: { id: dialogueId } });

    if (dialogue === null) {
      throw new NotFoundException('Dialogue not found.');
    }

    return dialogue;
  }

  private advanceReadWatermark(dialogueId: string, through: bigint) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { readSignificantSequence: through, version: { increment: 1 } },
    });
  }
}
