import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { getOffsetPagination } from '../../../../infrastructure/pagination/get-offset-pagination.js';
import { WorkspaceProjectService } from '../../application/workspace-project.service.js';
import { workspaceIncludeArchived } from '../../validation/workspace-input.js';
import {
  ListWorkspacesQuery,
  type ListWorkspacesQueryReturnType,
} from '../impl/list-workspaces.query.js';

@QueryHandler(ListWorkspacesQuery)
export class ListWorkspacesHandler implements IQueryHandler<
  ListWorkspacesQuery,
  ListWorkspacesQueryReturnType
> {
  constructor(
    private readonly projects: WorkspaceProjectService,
    private readonly transactions: TransactionPrismaService,
  ) {}

  async execute({ data }: ListWorkspacesQuery): Promise<ListWorkspacesQueryReturnType> {
    return this.transactions.runRepeatableRead(async (prisma) => {
      await this.projects.assertAccessible(data.projectId);
      const includeArchived = workspaceIncludeArchived(data.includeArchived);
      const where = {
        projectId: data.projectId,
        ...(includeArchived === true ? {} : { isArchived: false }),
      };

      return getOffsetPagination({
        pageData: data,
        findMany: async ({ skip, take }) =>
          (
            await prisma.workspace.findMany({
              where,
              skip,
              take,
              orderBy: [{ name: 'asc' }, { id: 'asc' }],
            })
          ).map((record) => ({
            ...record,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
            archivedAt: record.archivedAt?.toISOString() ?? null,
          })),
        count: () => prisma.workspace.count({ where }),
      });
    });
  }
}
