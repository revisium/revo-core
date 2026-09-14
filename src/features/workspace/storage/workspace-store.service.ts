import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../__generated__/client/client.js';
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

  async getConnected(projectId: string, id: string) {
    const record = await this.get(projectId, id);

    if (record.disconnectedAt !== null) {
      throw new WorkspaceError('WORKSPACE_CONFLICT');
    }

    return record;
  }

  async update(
    projectId: string,
    id: string,
    changes: Prisma.WorkspaceUpdateManyMutationInput,
    actorId: string,
    operation: string,
    details: Prisma.InputJsonObject,
  ): Promise<boolean> {
    const transaction = this.transactions.getTransaction();
    const result = await transaction.workspace.updateMany({
      where: { id, projectId, disconnectedAt: null },
      data: changes,
    });

    if (result.count !== 1) {
      throw new WorkspaceError('WORKSPACE_CONFLICT');
    }

    await transaction.workspaceEvent.create({
      data: { workspaceId: id, actorId, operation, details },
    });

    return true;
  }
}
