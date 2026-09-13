import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { getOffsetPagination } from '../../../../infrastructure/pagination/get-offset-pagination.js';
import { WorkspaceProjectService } from '../../application/workspace-project.service.js';
import { toWorkspace } from '../../storage/workspace.mapper.js';
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
    private readonly prisma: PrismaService,
  ) {}

  async execute({ data }: ListWorkspacesQuery): Promise<ListWorkspacesQueryReturnType> {
    await this.projects.assertAccessible(data.projectId);
    const where = { projectId: data.projectId, disconnectedAt: null };

    return getOffsetPagination({
      pageData: data,
      findMany: async ({ skip, take }) =>
        (
          await this.prisma.workspace.findMany({
            where,
            skip,
            take,
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
          })
        ).map(toWorkspace),
      count: () => this.prisma.workspace.count({ where }),
    });
  }
}
