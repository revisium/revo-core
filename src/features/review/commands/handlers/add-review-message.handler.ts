import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  AddReviewMessageCommand,
  type AddReviewMessageCommandData,
  type AddReviewMessageCommandReturnType,
} from '../impl/add-review-message.command.js';

@CommandHandler(AddReviewMessageCommand)
export class AddReviewMessageHandler implements ICommandHandler<
  AddReviewMessageCommand,
  AddReviewMessageCommandReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: AddReviewMessageCommand): Promise<AddReviewMessageCommandReturnType> {
    return this.transactions.runSerializable(() => this.transactionHandler(data));
  }

  private async transactionHandler(data: AddReviewMessageCommandData): Promise<boolean> {
    await this.getThread(data.threadId);
    await this.addReviewMessage(data);

    return true;
  }

  private getThread(threadId: string) {
    return this.transaction.reviewThread.findUniqueOrThrow({
      where: { id: threadId },
    });
  }

  private addReviewMessage(data: AddReviewMessageCommandData) {
    return this.transaction.reviewMessage.create({
      data: {
        id: data.messageId,
        threadId: data.threadId,
        authorId: data.authorId,
        body: data.body,
      },
    });
  }
}
