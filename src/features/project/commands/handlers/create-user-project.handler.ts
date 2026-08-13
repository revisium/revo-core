import { BadRequestException, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { IdService } from '@revisium/engine';
import { nanoid } from 'nanoid';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { ProjectKind } from '../../../../__generated__/client/enums.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { ProjectError } from '../../project-errors.js';
import type { UserProject } from '../../user-project.js';
import {
  ApplyContentModelCommand,
  type ApplyContentModelCommandReturnType,
} from '../impl/apply-content-model.command.js';
import {
  CreateUserProjectCommand,
  type CreateUserProjectCommandReturnType,
} from '../impl/create-user-project.command.js';
import {
  DeleteUserProjectCommand,
  type DeleteUserProjectCommandReturnType,
} from '../impl/delete-user-project.command.js';

const DEFAULT_BRANCH_NAME = 'master';

@CommandHandler(CreateUserProjectCommand)
export class CreateUserProjectHandler implements ICommandHandler<
  CreateUserProjectCommand,
  CreateUserProjectCommandReturnType
> {
  private readonly logger = new Logger(CreateUserProjectHandler.name);

  constructor(
    private readonly commands: CommandBus,
    private readonly transactions: TransactionPrismaService,
    private readonly ids: IdService,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({ data }: CreateUserProjectCommand): Promise<CreateUserProjectCommandReturnType> {
    if (typeof data.name !== 'string' || data.name.trim() === '') {
      throw new BadRequestException(ProjectError.nameRequired);
    }

    const project = await this.transactions.runSerializable(() =>
      this.createProject(data.name.trim()),
    );
    try {
      await this.commands.execute<ApplyContentModelCommand, ApplyContentModelCommandReturnType>(
        new ApplyContentModelCommand({ projectId: project.id }),
      );
    } catch (error) {
      await this.removeCreatedProject(project.id);
      throw error;
    }

    return project;
  }

  private async createProject(name: string): Promise<UserProject> {
    const projectId = nanoid();
    const branchId = this.ids.generate();
    const headRevisionId = this.ids.generate();
    const draftRevisionId = this.ids.generate();

    const project = await this.transaction.project.create({
      data: {
        id: projectId,
        name,
        kind: ProjectKind.USER,
        branches: {
          create: {
            id: branchId,
            name: DEFAULT_BRANCH_NAME,
            isRoot: true,
            revisions: {
              createMany: {
                data: [
                  {
                    id: headRevisionId,
                    isHead: true,
                    isStart: true,
                  },
                  {
                    id: draftRevisionId,
                    parentId: headRevisionId,
                    isDraft: true,
                  },
                ],
              },
            },
          },
        },
      },
      select: { id: true, name: true },
    });

    return project;
  }

  private async removeCreatedProject(projectId: string): Promise<void> {
    try {
      await this.commands.execute<DeleteUserProjectCommand, DeleteUserProjectCommandReturnType>(
        new DeleteUserProjectCommand({ projectId }),
      );
    } catch (cleanupError) {
      const details =
        cleanupError instanceof Error ? cleanupError.message : 'Project remnant cleanup failed.';
      this.logger.error(details);
    }
  }
}
