import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { IdService } from '@revisium/engine';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { ProjectStatus } from '../../../../__generated__/client/enums.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  EnsureProjectCommand,
  type EnsureProjectCommandData,
  type EnsureProjectCommandReturnType,
} from '../impl/ensure-project.command.js';

const DEFAULT_BRANCH_NAME = 'master';

@CommandHandler(EnsureProjectCommand)
export class EnsureProjectHandler implements ICommandHandler<
  EnsureProjectCommand,
  EnsureProjectCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly ids: IdService,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: EnsureProjectCommand): Promise<EnsureProjectCommandReturnType> {
    return this.transactions.runSerializable(() => this.ensureProject(data));
  }

  private async ensureProject(
    data: EnsureProjectCommandData,
  ): Promise<EnsureProjectCommandReturnType> {
    const project = await this.findProject(data.id);

    if (project !== null) {
      return project.id;
    }

    return this.createProject(data);
  }

  private findProject(projectId: string) {
    return this.transaction.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
  }

  private async createProject(
    data: EnsureProjectCommandData,
  ): Promise<EnsureProjectCommandReturnType> {
    const branchId = this.ids.generate();
    const headRevisionId = this.ids.generate();
    const draftRevisionId = this.ids.generate();

    const project = await this.transaction.project.create({
      data: {
        ...data,
        status: ProjectStatus.ACTIVE,
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
}
