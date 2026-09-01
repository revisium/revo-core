import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { ProjectKind, ProjectStatus } from '../../../../__generated__/client/enums.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { ProjectError } from '../../contracts/project.errors.js';
import {
  UpdateUserProjectCommand,
  type UpdateUserProjectCommandData,
  type UpdateUserProjectCommandReturnType,
} from '../impl/update-user-project.command.js';

type ProjectChanges = {
  name?: string;
  description?: string;
};

@CommandHandler(UpdateUserProjectCommand)
export class UpdateUserProjectHandler implements ICommandHandler<
  UpdateUserProjectCommand,
  UpdateUserProjectCommandReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: UpdateUserProjectCommand): Promise<UpdateUserProjectCommandReturnType> {
    const changes = this.readChanges(data);

    return this.transactions.runSerializable(() => this.applyChanges(data.id, changes));
  }

  private readChanges(data: UpdateUserProjectCommandData): ProjectChanges {
    const changes: ProjectChanges = {};

    if (data.name !== undefined) {
      changes.name = this.readName(data.name);
    }

    if (data.description !== undefined) {
      changes.description = this.readDescription(data.description);
    }

    return changes;
  }

  private readName(name: string): string {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new BadRequestException(ProjectError.nameRequired);
    }

    return name.trim();
  }

  private readDescription(description: string): string {
    if (typeof description !== 'string') {
      throw new BadRequestException(ProjectError.descriptionInvalid);
    }

    return description;
  }

  private async applyChanges(id: string, changes: ProjectChanges): Promise<boolean> {
    await this.assertActiveProject(id);

    if (Object.keys(changes).length > 0) {
      await this.transaction.project.update({ where: { id }, data: changes });
    }

    return true;
  }

  private async assertActiveProject(id: string): Promise<void> {
    const project = await this.transaction.project.findFirst({
      where: { id, kind: ProjectKind.USER, status: { not: ProjectStatus.CREATING } },
      select: { status: true },
    });

    if (project === null) {
      throw new NotFoundException(ProjectError.notFound);
    }

    if (project.status !== ProjectStatus.ACTIVE) {
      throw new ConflictException(ProjectError.notActive);
    }
  }
}
