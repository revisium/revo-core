import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { WorkspaceProjectService } from '../../application/workspace-project.service.js';
import { LocalWorkspaceSourceService } from '../../source/local-workspace-source.service.js';
import {
  workspaceName,
  workspaceDescription,
  workspaceType,
  workspacePath,
  workspaceActor,
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
    private readonly source: LocalWorkspaceSourceService,
  ) {}

  async execute({
    data,
    context,
  }: CreateWorkspaceCommand): Promise<CreateWorkspaceCommandReturnType> {
    const actorId = workspaceActor(context);
    const input = {
      projectId: data.projectId,
      name: workspaceName(data.name),
      description: workspaceDescription(data.description === undefined ? '' : data.description),
      type: workspaceType(data.type),
      sourcePath: workspacePath(data.sourcePath),
    };

    await this.projects.assertAccessible(data.projectId, true);

    const check = await this.source.check(input.sourcePath, input.type, context?.fileSystemAccess);

    return this.transactions.runSerializable(async (transaction) => {
      await this.projects.assertAccessible(data.projectId, true);

      const record = await transaction.workspace.create({
        data: {
          ...input,
          ...check,
          events: {
            create: {
              actorId,
              operation: 'create',
              details: {
                name: input.name,
                type: input.type,
                sourcePath: input.sourcePath,
                availability: check.availability,
              },
            },
          },
        },
      });

      return { workspaceId: record.id };
    });
  }
}
