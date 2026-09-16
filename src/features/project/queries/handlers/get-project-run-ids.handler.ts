import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { ProjectKind, ProjectStatus } from '../../../../__generated__/client/enums.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { ProjectError } from '../../contracts/project.errors.js';
import {
  GetProjectRunIdsQuery,
  type GetProjectRunIdsQueryReturnType,
} from '../impl/get-project-run-ids.query.js';

@QueryHandler(GetProjectRunIdsQuery)
export class GetProjectRunIdsHandler implements IQueryHandler<
  GetProjectRunIdsQuery,
  GetProjectRunIdsQueryReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  execute({ data }: GetProjectRunIdsQuery): Promise<GetProjectRunIdsQueryReturnType> {
    return this.transactions.runRepeatableRead(async (prisma) => {
      const project = await prisma.project.findFirst({
        where: {
          id: data.projectId,
          kind: ProjectKind.USER,
          status: { in: [ProjectStatus.ACTIVE, ProjectStatus.ARCHIVED] },
        },
        select: { id: true },
      });

      if (project === null) {
        throw new NotFoundException(ProjectError.notFound);
      }

      const reservations = await prisma.projectRun.findMany({
        where: { projectId: project.id },
        orderBy: { runId: 'asc' },
        select: { runId: true },
      });

      return reservations.map(({ runId }) => runId);
    });
  }
}
