import { ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  CreateReviewThreadCommand,
  type CreateReviewThreadCommandData,
  type CreateReviewThreadCommandReturnType,
} from '../impl/create-review-thread.command.js';

@CommandHandler(CreateReviewThreadCommand)
export class CreateReviewThreadHandler implements ICommandHandler<
  CreateReviewThreadCommand,
  CreateReviewThreadCommandReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: CreateReviewThreadCommand): Promise<CreateReviewThreadCommandReturnType> {
    return this.transactions.runSerializable(() => this.transactionHandler(data));
  }

  private async transactionHandler(data: CreateReviewThreadCommandData): Promise<boolean> {
    const thread = await this.findThread(data.threadId);

    if (thread !== null) {
      throw new ConflictException(`Review thread ${data.threadId} already exists.`);
    }

    await this.createThread(data);

    return true;
  }

  private findThread(threadId: string) {
    return this.transaction.reviewThread.findUnique({
      where: { id: threadId },
    });
  }

  private createThread(data: CreateReviewThreadCommandData) {
    return this.transaction.reviewThread.create({
      data: {
        id: data.threadId,
        scopeKey: data.scopeKey,
        subjectKey: data.subjectKey,
        contextKey: data.contextKey,
        context: data.context,
        messages: {
          create: {
            id: data.initialMessageId,
            authorId: data.authorId,
            body: data.body,
          },
        },
      },
    });
  }
}
