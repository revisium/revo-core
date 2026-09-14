import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { WorkspaceProjectService } from '../../application/workspace-project.service.js';
import {
  workspaceName,
  workspaceDescription,
  workspaceType,
  workspacePath,
} from '../../validation/workspace-input.js';
import {
  CreateWorkspaceCommand,
  type CreateWorkspaceCommandReturnType,
} from '../impl/create-workspace.command.js';

@CommandHandler(CreateWorkspaceCommand)
export class CreateWorkspaceHandler implements ICommandHandler<
  CreateWorkspaceCommand,
  CreateWorkspaceCommandReturnType
> {
  constructor(
    private readonly projects: WorkspaceProjectService,
    private readonly transactions: TransactionPrismaService,
  ) {}

  async execute({ data }: CreateWorkspaceCommand): Promise<CreateWorkspaceCommandReturnType> {
    const input = {
      projectId: data.projectId,
      name: workspaceName(data.name),
      description: workspaceDescription(data.description === undefined ? '' : data.description),
      type: workspaceType(data.type),
      sourcePath: workspacePath(data.sourcePath),
    };

    return this.transactions.runSerializable(async (transaction) => {
      await this.projects.assertAccessible(data.projectId, true);
      const record = await transaction.workspace.create({
        data: input,
      });

      return {
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        archivedAt: record.archivedAt?.toISOString() ?? null,
      };
    });
  }
}
