import { ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma, ReviewMessage } from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  EditReviewMessageCommand,
  type EditReviewMessageCommandData,
  type EditReviewMessageCommandReturnType,
} from '../impl/edit-review-message.command.js';

@CommandHandler(EditReviewMessageCommand)
export class EditReviewMessageHandler implements ICommandHandler<
  EditReviewMessageCommand,
  EditReviewMessageCommandReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: EditReviewMessageCommand): Promise<EditReviewMessageCommandReturnType> {
    return this.transactions.runSerializable(() => this.transactionHandler(data));
  }

  private async transactionHandler(data: EditReviewMessageCommandData): Promise<boolean> {
    const message = await this.getMessage(data.messageId);

    this.ensureMessageCanBeEdited(message, data.expectedVersion);
    await this.updateMessage(data);

    return true;
  }

  private getMessage(messageId: string) {
    return this.transaction.reviewMessage.findUniqueOrThrow({
      where: { id: messageId },
    });
  }

  private ensureMessageCanBeEdited(message: ReviewMessage, expectedVersion: number): void {
    if (message.deletedAt !== null) {
      throw new ConflictException(`Review message ${message.id} is deleted.`);
    }

    if (message.version !== expectedVersion) {
      throw new ConflictException(`Review message ${message.id} has a different version.`);
    }
  }

  private updateMessage(data: EditReviewMessageCommandData) {
    return this.transaction.reviewMessage.update({
      where: { id: data.messageId },
      data: {
        body: data.body,
        editedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }
}
