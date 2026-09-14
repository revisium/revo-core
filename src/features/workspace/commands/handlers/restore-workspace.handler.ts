import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { WorkspaceProjectService } from '../../application/workspace-project.service.js';
import { WorkspaceStoreService } from '../../storage/workspace-store.service.js';
import {
  RestoreWorkspaceCommand,
  type RestoreWorkspaceCommandReturnType,
} from '../impl/restore-workspace.command.js';

@CommandHandler(RestoreWorkspaceCommand)
export class RestoreWorkspaceHandler implements ICommandHandler<
  RestoreWorkspaceCommand,
  RestoreWorkspaceCommandReturnType
> {
  constructor(
    private readonly projects: WorkspaceProjectService,
    private readonly transactions: TransactionPrismaService,
    private readonly store: WorkspaceStoreService,
  ) {}

  async execute({ data }: RestoreWorkspaceCommand): Promise<RestoreWorkspaceCommandReturnType> {
    return this.transactions.runSerializable(async () => {
      await this.projects.assertAccessible(data.projectId, true);
      let record = await this.store.get(data.projectId, data.id);

      if (record.isArchived) {
        record = await this.store.update(data.projectId, data.id, {
          isArchived: false,
          archivedAt: null,
        });
      }

      return {
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        archivedAt: record.archivedAt?.toISOString() ?? null,
      };
    });
  }
}
