import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { WorkspaceProjectService } from '../../application/workspace-project.service.js';
import { LocalWorkspaceSourceService } from '../../source/local-workspace-source.service.js';
import { WorkspaceStoreService } from '../../storage/workspace-store.service.js';
import {
  workspaceName,
  workspaceDescription,
  workspacePath,
  workspaceActor,
  workspaceVersion,
} from '../../validation/workspace-input.js';
import {
  UpdateWorkspaceCommand,
  type UpdateWorkspaceCommandReturnType,
} from '../impl/update-workspace.command.js';

@CommandHandler(UpdateWorkspaceCommand)
export class UpdateWorkspaceHandler implements ICommandHandler<
  UpdateWorkspaceCommand,
  UpdateWorkspaceCommandReturnType
> {
  constructor(
    private readonly projects: WorkspaceProjectService,
    private readonly transactions: TransactionPrismaService,
    private readonly source: LocalWorkspaceSourceService,
    private readonly store: WorkspaceStoreService,
  ) {}

  async execute({
    data,
    context,
  }: UpdateWorkspaceCommand): Promise<UpdateWorkspaceCommandReturnType> {
    const actorId = workspaceActor(context);
    const expectedVersion = workspaceVersion(data.expectedVersion);
    const changes = {
      ...(data.name === undefined ? {} : { name: workspaceName(data.name) }),
      ...(data.description === undefined
        ? {}
        : { description: workspaceDescription(data.description) }),
      ...(data.sourcePath === undefined ? {} : { sourcePath: workspacePath(data.sourcePath) }),
    };
    await this.projects.assertAccessible(data.projectId, true);
    const current = await this.store.getConnected(data.projectId, data.id, expectedVersion);
    const check =
      changes.sourcePath === undefined
        ? {}
        : await this.source.check(changes.sourcePath, current.type, context?.fileSystemAccess);

    return this.transactions.runSerializable(async () => {
      await this.projects.assertAccessible(data.projectId, true);
      await this.store.getConnected(data.projectId, data.id, expectedVersion);

      if (Object.keys(changes).length === 0) {
        return true;
      }

      return this.store.update(
        data.projectId,
        data.id,
        expectedVersion,
        { ...changes, ...check },
        actorId,
        'update',
        changes,
      );
    });
  }
}
