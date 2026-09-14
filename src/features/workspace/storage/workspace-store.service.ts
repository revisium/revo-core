import { Injectable } from '@nestjs/common';

import type { Workspace } from '../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../infrastructure/database/transaction-prisma.service.js';
import { WorkspaceError } from '../contracts/workspace.errors.js';

@Injectable()
export class WorkspaceStoreService {
  constructor(private readonly transactions: TransactionPrismaService) {}

  async get(projectId: string, id: string) {
    const record = await this.transactions
      .getTransactionOrPrisma()
      .workspace.findFirst({ where: { id, projectId } });

    if (record === null) {
      throw new WorkspaceError('WORKSPACE_NOT_FOUND');
    }

    return record;
  }

  async getActive(projectId: string, id: string) {
    const record = await this.get(projectId, id);

    if (record.isArchived) {
      throw new WorkspaceError('WORKSPACE_ARCHIVED');
    }

    return record;
  }

  async update(
    projectId: string,
    id: string,
    changes: {
      name?: string;
      description?: string;
      sourcePath?: string;
      isArchived?: boolean;
      archivedAt?: Date | null;
    },
  ): Promise<Workspace> {
    const transaction = this.transactions.getTransaction();
    const [record] = await transaction.workspace.updateManyAndReturn({
      where: { id, projectId },
      data: changes,
    });

    if (record === undefined) {
      throw new WorkspaceError('WORKSPACE_NOT_FOUND');
    }

    return record;
  }
}
