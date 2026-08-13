import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { ProjectKind } from '../../../../__generated__/client/enums.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { getOffsetPagination } from '../../commands/utils/getOffsetPagination.js';
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
      pageData: data.after === undefined ? { first: data.first } : data,
      findMany: ({ take, skip }) =>
        this.prisma.project.findMany({
          where: { kind: ProjectKind.USER },
          orderBy: { id: 'asc' },
          take,
          skip,
          select: { id: true, name: true },
        }),
      count: () => this.prisma.project.count({ where: { kind: ProjectKind.USER } }),
    });
  }
}
