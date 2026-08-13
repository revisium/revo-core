import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { ProjectKind } from '../../../../__generated__/client/enums.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
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

  async execute({ data }: ListUserProjectsQuery): Promise<ListUserProjectsQueryReturnType> {
    const afterFilter = data.after === undefined ? {} : { id: { gt: data.after } };
    const [totalCount, rows] = await Promise.all([
      this.prisma.project.count({ where: { kind: ProjectKind.USER } }),
      this.prisma.project.findMany({
        where: { kind: ProjectKind.USER, ...afterFilter },
        orderBy: { id: 'asc' },
        take: data.first + 1,
        select: { id: true, name: true },
      }),
    ]);

    const hasNextPage = rows.length > data.first;
    const nodes = hasNextPage ? rows.slice(0, data.first) : rows;
    const edges = nodes.map((node) => ({ cursor: node.id, node }));
    const startCursor = edges[0]?.cursor;
    const endCursor = edges.at(-1)?.cursor;

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: data.after !== undefined,
        ...(startCursor === undefined ? {} : { startCursor }),
        ...(endCursor === undefined ? {} : { endCursor }),
      },
      totalCount,
    };
  }
}
