import { ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma, ReviewThread } from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  ReopenReviewThreadCommand,
  type ReopenReviewThreadCommandData,
  type ReopenReviewThreadCommandReturnType,
} from '../impl/reopen-review-thread.command.js';

@CommandHandler(ReopenReviewThreadCommand)
export class ReopenReviewThreadHandler implements ICommandHandler<
  ReopenReviewThreadCommand,
  ReopenReviewThreadCommandReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: ReopenReviewThreadCommand): Promise<ReopenReviewThreadCommandReturnType> {
    return this.transactions.runSerializable(() => this.transactionHandler(data));
  }

  private async transactionHandler(data: ReopenReviewThreadCommandData): Promise<boolean> {
    const thread = await this.getThread(data.threadId);

    if (thread.resolvedAt === null) {
      throw new ConflictException(`Review thread ${data.threadId} is already open.`);
    }

    this.ensureExpectedVersion(thread, data.expectedVersion);
    await this.reopenThread(data.threadId);

    return true;
  }

  private getThread(threadId: string) {
    return this.transaction.reviewThread.findUniqueOrThrow({
      where: { id: threadId },
    });
  }

  private ensureExpectedVersion(thread: ReviewThread, expectedVersion: number): void {
    if (thread.version !== expectedVersion) {
      throw new ConflictException(`Review thread ${thread.id} has a different version.`);
    }
  }

  private reopenThread(threadId: string) {
    return this.transaction.reviewThread.update({
      where: { id: threadId },
      data: {
        resolvedAt: null,
        resolvedBy: null,
        version: { increment: 1 },
      },
    });
  }
}
