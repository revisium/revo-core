import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { ProjectKind, ProjectStatus } from '../../../../__generated__/client/enums.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { ProjectError } from '../../contracts/project.errors.js';
import {
  ArchiveUserProjectCommand,
  type ArchiveUserProjectCommandReturnType,
} from '../impl/archive-user-project.command.js';

@CommandHandler(ArchiveUserProjectCommand)
export class ArchiveUserProjectHandler implements ICommandHandler<
  ArchiveUserProjectCommand,
  ArchiveUserProjectCommandReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: ArchiveUserProjectCommand): Promise<ArchiveUserProjectCommandReturnType> {
    return this.transactions.runSerializable(() => this.archiveProject(data.projectId));
  }

  private async archiveProject(projectId: string): Promise<ArchiveUserProjectCommandReturnType> {
    const project = await this.transaction.project.findFirst({
      where: { id: projectId, kind: ProjectKind.USER },
      select: { status: true },
    });

    if (project === null || project.status === ProjectStatus.CREATING) {
      throw new NotFoundException(ProjectError.notFound);
    }

    if (project.status !== ProjectStatus.ACTIVE) {
      throw new ConflictException(ProjectError.notActive);
    }

    await this.transaction.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ARCHIVED },
      select: { id: true },
    });

    return true;
  }
}
