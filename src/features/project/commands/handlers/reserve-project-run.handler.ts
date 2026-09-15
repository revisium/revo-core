import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { ProjectKind, ProjectStatus } from '../../../../__generated__/client/enums.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { ProjectApplicationError, ProjectErrorCode } from '../../contracts/project.errors.js';
import {
  ReserveProjectRunCommand,
  type ReserveProjectRunCommandReturnType,
} from '../impl/reserve-project-run.command.js';

@CommandHandler(ReserveProjectRunCommand)
export class ReserveProjectRunHandler implements ICommandHandler<
  ReserveProjectRunCommand,
  ReserveProjectRunCommandReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: ReserveProjectRunCommand): Promise<ReserveProjectRunCommandReturnType> {
    return this.transactions.runSerializable(async () => {
      const project = await this.transaction.project.findFirst({
        where: { id: data.projectId, kind: ProjectKind.USER },
        select: { status: true },
      });

      if (project === null || project.status === ProjectStatus.CREATING) {
        throw new ProjectApplicationError({ code: ProjectErrorCode.notFound, details: {} });
      }

      if (project.status !== ProjectStatus.ACTIVE) {
        throw new ProjectApplicationError({ code: ProjectErrorCode.notActive, details: {} });
      }

      await this.transaction.projectRun.create({ data });
    });
  }
}
