import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../src/__generated__/client/client.js';
import { TransactionPrismaService } from '../../../src/infrastructure/database/transaction-prisma.service.js';

@Injectable()
export class ControllableTransactionPrismaService extends TransactionPrismaService {
  private transactionBarrier:
    | { readonly reached: () => void; readonly release: Promise<void> }
    | undefined;

  holdNextTransaction(): { readonly reached: Promise<void>; release(): void } {
    if (this.transactionBarrier !== undefined) {
      throw new Error('A dialogue transaction barrier is already active.');
    }

    const reached = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    this.transactionBarrier = { reached: reached.resolve, release: release.promise };

    return { reached: reached.promise, release: release.resolve };
  }

  override runReadCommitted<T>(
    handler: (client: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return super.runReadCommitted(async (transaction) => {
      const barrier = this.transactionBarrier;

      if (barrier !== undefined) {
        this.transactionBarrier = undefined;
        barrier.reached();
        await barrier.release;
      }

      return handler(transaction);
    });
  }
}
