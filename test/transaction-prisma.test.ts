import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { databaseConfig } from '../src/config/database.config.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { TransactionPrismaService } from '../src/infrastructure/database/transaction-prisma.service.js';

let prisma: PrismaService;

beforeEach(() => {
  prisma = new PrismaService(new ConfigService({ database: databaseConfig() }));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await prisma.$disconnect();
});

test('retries a PostgreSQL serialization failure reported by the Prisma adapter at commit', async () => {
  const committed = { id: 'workspace' };
  const transaction = vi
    .spyOn(prisma, '$transaction')
    .mockRejectedValueOnce(
      Object.assign(new Error('TransactionWriteConflict'), {
        name: 'DriverAdapterError',
        cause: { kind: 'TransactionWriteConflict', originalCode: '40001' },
      }),
    )
    .mockResolvedValueOnce(committed);
  const service = new TransactionPrismaService(prisma);
  expect(await service.runSerializable(() => Promise.resolve(committed))).toEqual(committed);
  expect(transaction).toHaveBeenCalledTimes(2);
});

test('does not retry an unrelated adapter failure', async () => {
  const failure = Object.assign(new Error('Database error'), {
    name: 'DriverAdapterError',
    cause: { originalCode: '23505' },
  });
  const transaction = vi.spyOn(prisma, '$transaction').mockRejectedValue(failure);
  const service = new TransactionPrismaService(prisma);
  await expect(service.runSerializable(() => Promise.resolve(true))).rejects.toBe(failure);
  expect(transaction).toHaveBeenCalledTimes(1);
});
