import { ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma, ReviewMessage } from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  DeleteReviewMessageCommand,
  type DeleteReviewMessageCommandData,
  type DeleteReviewMessageCommandReturnType,
} from '../impl/delete-review-message.command.js';

@CommandHandler(DeleteReviewMessageCommand)
export class DeleteReviewMessageHandler implements ICommandHandler<
  DeleteReviewMessageCommand,
  DeleteReviewMessageCommandReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: DeleteReviewMessageCommand): Promise<DeleteReviewMessageCommandReturnType> {
    return this.transactions.runSerializable(() => this.transactionHandler(data));
  }

  private async transactionHandler(data: DeleteReviewMessageCommandData): Promise<boolean> {
    const message = await this.getMessage(data.messageId);

    if (message.deletedAt !== null) {
      throw new ConflictException(`Review message ${data.messageId} is already deleted.`);
    }

    this.ensureExpectedVersion(message, data.expectedVersion);
    await this.deleteMessage(data);

    return true;
  }

  private getMessage(messageId: string) {
    return this.transaction.reviewMessage.findUniqueOrThrow({
      where: { id: messageId },
    });
  }

  private ensureExpectedVersion(message: ReviewMessage, expectedVersion: number): void {
    if (message.version !== expectedVersion) {
      throw new ConflictException(`Review message ${message.id} has a different version.`);
    }
  }

  private deleteMessage(data: DeleteReviewMessageCommandData) {
    return this.transaction.reviewMessage.update({
      where: { id: data.messageId },
      data: {
        body: null,
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        version: { increment: 1 },
      },
    });
  }
}
