import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { ProjectKind } from '../../../../__generated__/client/enums.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { ProjectError } from '../../constants/project.constants.js';
import {
  CleanupProjectDatasetCommand,
  type CleanupProjectDatasetCommandReturnType,
} from '../impl/cleanup-project-dataset.command.js';
import {
  DeleteUserProjectCommand,
  type DeleteUserProjectCommandReturnType,
} from '../impl/delete-user-project.command.js';

const DEFAULT_BRANCH_NAME = 'master';

@CommandHandler(DeleteUserProjectCommand)
export class DeleteUserProjectHandler implements ICommandHandler<
  DeleteUserProjectCommand,
  DeleteUserProjectCommandReturnType
> {
  constructor(
    private readonly commands: CommandBus,
    private readonly transactions: TransactionPrismaService,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({ data }: DeleteUserProjectCommand): Promise<DeleteUserProjectCommandReturnType> {
    await this.transactions.runSerializable(() => this.deleteProject(data.projectId));
    await this.commands.execute<
      CleanupProjectDatasetCommand,
      CleanupProjectDatasetCommandReturnType
    >(new CleanupProjectDatasetCommand({ projectId: data.projectId }));
    return true;
  }

  private async deleteProject(projectId: string): Promise<void> {
    const project = await this.transaction.project.findFirst({
      where: { id: projectId, kind: ProjectKind.USER },
      select: { id: true },
    });
    if (project === null) {
      throw new NotFoundException(ProjectError.notFound);
    }

    await this.transaction.branch.delete({
      where: {
        name_projectId: {
          name: DEFAULT_BRANCH_NAME,
          projectId,
        },
      },
    });
    await this.transaction.project.delete({
      where: { id: projectId },
    });
  }
}
