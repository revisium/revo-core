import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { WorkspaceProjectService } from '../../application/workspace-project.service.js';
import { WorkspaceStoreService } from '../../storage/workspace-store.service.js';
import {
  ArchiveWorkspaceCommand,
  type ArchiveWorkspaceCommandReturnType,
} from '../impl/archive-workspace.command.js';

@CommandHandler(ArchiveWorkspaceCommand)
export class ArchiveWorkspaceHandler implements ICommandHandler<
  ArchiveWorkspaceCommand,
  ArchiveWorkspaceCommandReturnType
> {
  constructor(
    private readonly projects: WorkspaceProjectService,
    private readonly transactions: TransactionPrismaService,
    private readonly store: WorkspaceStoreService,
  ) {}

  async execute({ data }: ArchiveWorkspaceCommand): Promise<ArchiveWorkspaceCommandReturnType> {
    return this.transactions.runSerializable(async () => {
      await this.projects.assertAccessible(data.projectId, true);
      let record = await this.store.get(data.projectId, data.id);

      if (!record.isArchived) {
        record = await this.store.update(data.projectId, data.id, {
          isArchived: true,
          archivedAt: new Date(),
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
