import { ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma, ReviewThread } from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  ResolveReviewThreadCommand,
  type ResolveReviewThreadCommandData,
  type ResolveReviewThreadCommandReturnType,
} from '../impl/resolve-review-thread.command.js';

@CommandHandler(ResolveReviewThreadCommand)
export class ResolveReviewThreadHandler implements ICommandHandler<
  ResolveReviewThreadCommand,
  ResolveReviewThreadCommandReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: ResolveReviewThreadCommand): Promise<ResolveReviewThreadCommandReturnType> {
    return this.transactions.runSerializable(() => this.transactionHandler(data));
  }

  private async transactionHandler(data: ResolveReviewThreadCommandData): Promise<boolean> {
    const thread = await this.getThread(data.threadId);

    if (thread.resolvedAt !== null) {
      throw new ConflictException(`Review thread ${data.threadId} is already resolved.`);
    }

    this.ensureExpectedVersion(thread, data.expectedVersion);
    await this.resolveThread(data);

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

  private resolveThread(data: ResolveReviewThreadCommandData) {
    return this.transaction.reviewThread.update({
      where: { id: data.threadId },
      data: {
        resolvedAt: new Date(),
        resolvedBy: data.resolvedBy,
        version: { increment: 1 },
      },
    });
  }
}
