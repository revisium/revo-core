import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { ProjectKind, ProjectStatus } from '../../../../__generated__/client/enums.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { ProjectError } from '../../contracts/project.errors.js';
import { ProjectContentModelService } from '../../project-content-model.service.js';
import {
  RestoreUserProjectCommand,
  type RestoreUserProjectCommandReturnType,
} from '../impl/restore-user-project.command.js';

@CommandHandler(RestoreUserProjectCommand)
export class RestoreUserProjectHandler implements ICommandHandler<
  RestoreUserProjectCommand,
  RestoreUserProjectCommandReturnType
> {
  constructor(
    private readonly contentModel: ProjectContentModelService,
    private readonly transactions: TransactionPrismaService,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({ data }: RestoreUserProjectCommand): Promise<RestoreUserProjectCommandReturnType> {
    await this.assertArchived(data.projectId);

    // Unlike creation, a current content model is still a successful restore.
    await this.contentModel.apply(data.projectId);

    return this.activateProject(data.projectId);
  }

  private async assertArchived(projectId: string): Promise<void> {
    const status = await this.readUserProjectStatus(projectId);

    if (status !== ProjectStatus.ARCHIVED) {
      throw this.restoreRejection(status);
    }
  }

  private async activateProject(projectId: string): Promise<RestoreUserProjectCommandReturnType> {
    const { count } = await this.transactions.runSerializable(() =>
      this.transaction.project.updateMany({
        where: { id: projectId, kind: ProjectKind.USER, status: ProjectStatus.ARCHIVED },
        data: { status: ProjectStatus.ACTIVE },
      }),
    );

    if (count === 0) {
      const projectStatus = await this.readUserProjectStatus(projectId);

      throw this.restoreRejection(projectStatus);
    }

    return true;
  }

  private async readUserProjectStatus(projectId: string): Promise<ProjectStatus | null> {
    const project = await this.transactions.getTransactionOrPrisma().project.findFirst({
      where: { id: projectId, kind: ProjectKind.USER },
      select: { status: true },
    });

    return project === null ? null : project.status;
  }

  private restoreRejection(status: ProjectStatus | null): NotFoundException | ConflictException {
    return status === null || status === ProjectStatus.CREATING
      ? new NotFoundException(ProjectError.notFound)
      : new ConflictException(ProjectError.notArchived);
  }
}
