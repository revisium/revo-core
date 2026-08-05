import { AsyncLocalStorage } from 'node:async_hooks';

import { Injectable } from '@nestjs/common';

import { Prisma } from '../../__generated__/client/client.js';
import { PrismaService } from './prisma.service.js';

type TransactionClient = Prisma.TransactionClient;
type TransactionHandler<T> = (client: TransactionClient) => Promise<T>;

const SERIALIZABLE_RETRY_COUNT = 3;
const RETRYABLE_ERROR_CODES = new Set(['40001', '40P01', 'P2034']);

@Injectable()
export class TransactionPrismaService {
  private readonly transactionStorage = new AsyncLocalStorage<TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  getTransaction(): TransactionClient {
    const transaction = this.getTransactionUnsafe();

    if (transaction === undefined) {
      throw new Error('No Prisma transaction exists in the current context.');
    }

    return transaction;
  }

  getTransactionUnsafe(): TransactionClient | undefined {
    return this.transactionStorage.getStore();
  }

  getTransactionOrPrisma(): TransactionClient | PrismaService {
    return this.getTransactionUnsafe() ?? this.prisma;
  }

  runReadCommitted<T>(handler: TransactionHandler<T>): Promise<T> {
    return this.run(handler, Prisma.TransactionIsolationLevel.ReadCommitted);
  }

  runSerializable<T>(handler: TransactionHandler<T>): Promise<T> {
    return this.runWithRetry(handler, Prisma.TransactionIsolationLevel.Serializable);
  }

  private run<T>(
    handler: TransactionHandler<T>,
    isolationLevel: Prisma.TransactionIsolationLevel,
  ): Promise<T> {
    const currentTransaction = this.getTransactionUnsafe();

    if (currentTransaction !== undefined) {
      return handler(currentTransaction);
    }

    return this.prisma.$transaction(
      (transaction) => this.transactionStorage.run(transaction, () => handler(transaction)),
      { isolationLevel },
    );
  }

  private async runWithRetry<T>(
    handler: TransactionHandler<T>,
    isolationLevel: Prisma.TransactionIsolationLevel,
    attemptsRemaining = SERIALIZABLE_RETRY_COUNT,
  ): Promise<T> {
    try {
      return await this.run(handler, isolationLevel);
    } catch (error) {
      if (!this.isRetryable(error) || attemptsRemaining === 1) {
        throw error;
      }

      return this.runWithRetry(handler, isolationLevel, attemptsRemaining - 1);
    }
  }

  private isRetryable(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }

    return RETRYABLE_ERROR_CODES.has(String(error.code));
  }
}
