import { Injectable } from '@nestjs/common';

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
      archivedAt?: Date;
    },
  ): Promise<boolean> {
    const transaction = this.transactions.getTransaction();
    const result = await transaction.workspace.updateMany({
      where: { id, projectId, isArchived: false },
      data: changes,
    });

    if (result.count !== 1) {
      throw new WorkspaceError('WORKSPACE_ARCHIVED');
    }

    return true;
  }
}
