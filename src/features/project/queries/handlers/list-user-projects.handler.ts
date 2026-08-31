import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { ProjectKind, ProjectStatus } from '../../../../__generated__/client/enums.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { getOffsetPagination } from '../../commands/utils/getOffsetPagination.js';
import { toPublicProjectStatus } from '../../contracts/project.enums.js';
import {
  ListUserProjectsQuery,
  type ListUserProjectsQueryData,
  type ListUserProjectsQueryReturnType,
} from '../impl/list-user-projects.query.js';

@QueryHandler(ListUserProjectsQuery)
export class ListUserProjectsHandler implements IQueryHandler<
  ListUserProjectsQuery,
  ListUserProjectsQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  execute({ data }: ListUserProjectsQuery): Promise<ListUserProjectsQueryReturnType> {
    const where = this.buildWhere(data);

    return getOffsetPagination({
      pageData: data,
      findMany: async ({ take, skip }) => {
        const projects = await this.prisma.project.findMany({
          where,
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
      count: () => this.prisma.project.count({ where }),
    });
  }

  private buildWhere(data: ListUserProjectsQueryData): Prisma.ProjectWhereInput {
    const status =
      data.includeArchived === true
        ? { in: [ProjectStatus.ACTIVE, ProjectStatus.ARCHIVED] }
        : ProjectStatus.ACTIVE;

    if (data.query === undefined || data.query === '') {
      return { kind: ProjectKind.USER, status };
    }

    return {
      kind: ProjectKind.USER,
      status,
      OR: [{ name: { contains: data.query, mode: 'insensitive' } }, { id: data.query }],
    };
  }
}
