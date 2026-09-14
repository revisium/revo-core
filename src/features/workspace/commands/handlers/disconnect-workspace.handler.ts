import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { WorkspaceProjectService } from '../../application/workspace-project.service.js';
import { WorkspaceStoreService } from '../../storage/workspace-store.service.js';
import { workspaceActor } from '../../validation/workspace-input.js';
import {
  DisconnectWorkspaceCommand,
  type DisconnectWorkspaceCommandReturnType,
} from '../impl/disconnect-workspace.command.js';

@CommandHandler(DisconnectWorkspaceCommand)
export class DisconnectWorkspaceHandler implements ICommandHandler<
  DisconnectWorkspaceCommand,
  DisconnectWorkspaceCommandReturnType
> {
  constructor(
    private readonly projects: WorkspaceProjectService,
    private readonly transactions: TransactionPrismaService,
    private readonly store: WorkspaceStoreService,
  ) {}

  async execute({
    data,
    context,
  }: DisconnectWorkspaceCommand): Promise<DisconnectWorkspaceCommandReturnType> {
    const actorId = workspaceActor(context);
    return this.transactions.runSerializable(async () => {
      await this.projects.assertAccessible(data.projectId, true);
      await this.store.getConnected(data.projectId, data.id);

      return this.store.update(
        data.projectId,
        data.id,
        { disconnectedAt: new Date() },
        actorId,
        'disconnect',
        {},
      );
    });
  }
}
