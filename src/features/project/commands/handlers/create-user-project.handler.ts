import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { IdService } from '@revisium/engine';
import { nanoid } from 'nanoid';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { ProjectKind } from '../../../../__generated__/client/enums.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  CreateUserProjectCommand,
  type CreateUserProjectCommandReturnType,
} from '../impl/create-user-project.command.js';

const DEFAULT_BRANCH_NAME = 'master';

@CommandHandler(CreateUserProjectCommand)
export class CreateUserProjectHandler implements ICommandHandler<
  CreateUserProjectCommand,
  CreateUserProjectCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly ids: IdService,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: CreateUserProjectCommand): Promise<CreateUserProjectCommandReturnType> {
    return this.transactions.runSerializable(() => this.createProject(data.name));
  }

  private async createProject(name: string): Promise<CreateUserProjectCommandReturnType> {
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
      select: { id: true },
    });

    return project.id;
  }
}
