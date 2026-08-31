import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import {
  ProjectKind,
  ProjectStatus as StoredProjectStatus,
} from '../../../../__generated__/client/enums.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { getOffsetPagination } from '../../commands/utils/getOffsetPagination.js';
import { toPublicProjectStatus } from '../../contracts/project.enums.js';
import {
  ListUserProjectsQuery,
  type ListUserProjectsQueryReturnType,
} from '../impl/list-user-projects.query.js';

@QueryHandler(ListUserProjectsQuery)
export class ListUserProjectsHandler implements IQueryHandler<
  ListUserProjectsQuery,
  ListUserProjectsQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  execute({ data }: ListUserProjectsQuery): Promise<ListUserProjectsQueryReturnType> {
    return getOffsetPagination({
      pageData: data,
      findMany: async ({ take, skip }) => {
        const projects = await this.prisma.project.findMany({
          where: { kind: ProjectKind.USER, status: { not: StoredProjectStatus.CREATING } },
          orderBy: { id: 'asc' },
          take,
          skip,
          select: { id: true, name: true, description: true, status: true },
        });

        return projects.map((project) => ({
          ...project,
          status: toPublicProjectStatus(project.status),
        }));
      },
      count: () =>
        this.prisma.project.count({
          where: { kind: ProjectKind.USER, status: { not: StoredProjectStatus.CREATING } },
        }),
    });
  }
}
