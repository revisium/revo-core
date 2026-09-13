import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { WorkspaceProjectService } from '../../application/workspace-project.service.js';
import { LocalWorkspaceSourceService } from '../../source/local-workspace-source.service.js';
import { WorkspaceStoreService } from '../../storage/workspace-store.service.js';
import { workspaceActor, workspaceVersion } from '../../validation/workspace-input.js';
import {
  CheckWorkspaceCommand,
  type CheckWorkspaceCommandReturnType,
} from '../impl/check-workspace.command.js';

@CommandHandler(CheckWorkspaceCommand)
export class CheckWorkspaceHandler implements ICommandHandler<
  CheckWorkspaceCommand,
  CheckWorkspaceCommandReturnType
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
  }: CheckWorkspaceCommand): Promise<CheckWorkspaceCommandReturnType> {
    const actorId = workspaceActor(context);
    const expectedVersion = workspaceVersion(data.expectedVersion);
    await this.projects.assertAccessible(data.projectId, true);
    const current = await this.store.getConnected(data.projectId, data.id, expectedVersion);
    const check = await this.source.check(
      current.sourcePath,
      current.type,
      context?.fileSystemAccess,
    );

    return this.transactions.runSerializable(async () => {
      await this.projects.assertAccessible(data.projectId, true);
      await this.store.getConnected(data.projectId, data.id, expectedVersion);

      return this.store.update(data.projectId, data.id, expectedVersion, check, actorId, 'check', {
        availability: check.availability,
        errorCode: check.lastErrorCode,
      });
    });
  }
}
