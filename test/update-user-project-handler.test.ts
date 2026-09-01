import { describe, expect, test, vi } from 'vitest';

import { ProjectStatus } from '../src/__generated__/client/enums.js';
import { UpdateUserProjectHandler } from '../src/features/project/commands/handlers/update-user-project.handler.js';
import { UpdateUserProjectCommand } from '../src/features/project/commands/impl/update-user-project.command.js';
import { TransactionPrismaService } from '../src/infrastructure/database/transaction-prisma.service.js';

describe('UpdateUserProjectHandler', () => {
  test('never writes the project row when no field is passed', async () => {
    const update = vi.fn<() => Promise<{ id: string }>>(async () => ({ id: 'p1' }));
    const transaction = {
      project: {
        findFirst: async () => ({ status: ProjectStatus.ACTIVE }),
        update,
      },
    };
    const transactions = {
      getTransaction: () => transaction,
      runSerializable: <T>(run: (client: typeof transaction) => Promise<T>) => run(transaction),
    } as unknown as TransactionPrismaService;
    const handler = new UpdateUserProjectHandler(transactions);

    await expect(handler.execute(new UpdateUserProjectCommand({ id: 'p1' }))).resolves.toBe(true);

    expect(update).not.toHaveBeenCalled();
  });
});
