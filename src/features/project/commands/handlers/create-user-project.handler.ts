import { BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { IdService } from '@revisium/engine';
import { nanoid } from 'nanoid';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { ProjectKind, ProjectStatus } from '../../../../__generated__/client/enums.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { errorReason } from '../../../../infrastructure/error-reason.js';
import { ProjectError } from '../../contracts/project.errors.js';
import { ProjectContentModelService } from '../../project-content-model.service.js';
import {
  CreateUserProjectCommand,
  type CreateUserProjectCommandData,
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
    private readonly contentModel: ProjectContentModelService,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({ data }: CreateUserProjectCommand): Promise<CreateUserProjectCommandReturnType> {
    if (typeof data.name !== 'string' || data.name.trim() === '') {
      throw new BadRequestException(ProjectError.nameRequired);
    }

    const description = this.readDescription(data);
    const projectId = await this.transactions.runSerializable(() =>
      this.createProject(data.name.trim(), description),
    );

    try {
      const published = await this.contentModel.apply(projectId);

      if (!published) {
        throw new InternalServerErrorException(ProjectError.initCommitMissing);
      }
    } catch (error) {
      await this.removeCreatedProject(projectId);
      throw error;
    }

    return this.activateProject(projectId);
  }

  private readDescription(data: CreateUserProjectCommandData): string {
    if (data.description === undefined) {
      return '';
    }

    if (typeof data.description !== 'string') {
      throw new BadRequestException(ProjectError.descriptionInvalid);
    }

    return data.description;
  }

  private async createProject(name: string, description: string): Promise<string> {
    const projectId = nanoid();
    const branchId = this.ids.generate();
    const headRevisionId = this.ids.generate();
    const draftRevisionId = this.ids.generate();

    const project = await this.transaction.project.create({
      data: {
        id: projectId,
        name,
        description,
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
      select: { id: true },
    });

    return project.id;
  }

  private async activateProject(projectId: string): Promise<CreateUserProjectCommandReturnType> {
    const project = await this.transactions.runSerializable(() =>
      this.transaction.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.ACTIVE },
        select: { id: true },
      }),
    );

    return { projectId: project.id };
  }

  private async removeCreatedProject(projectId: string): Promise<void> {
    try {
      await this.commands.execute<DeleteUserProjectCommand, DeleteUserProjectCommandReturnType>(
        new DeleteUserProjectCommand({ projectId }),
      );
    } catch (cleanupError) {
      this.logger.error(errorReason(cleanupError, 'Project remnant cleanup failed.'));
    }
  }
}
