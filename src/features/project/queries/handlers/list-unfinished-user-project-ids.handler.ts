import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { ProjectKind, ProjectStatus } from '../../../../__generated__/client/enums.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  ListUnfinishedUserProjectIdsQuery,
  type ListUnfinishedUserProjectIdsQueryReturnType,
} from '../impl/list-unfinished-user-project-ids.query.js';

@QueryHandler(ListUnfinishedUserProjectIdsQuery)
export class ListUnfinishedUserProjectIdsHandler implements IQueryHandler<
  ListUnfinishedUserProjectIdsQuery,
  ListUnfinishedUserProjectIdsQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<ListUnfinishedUserProjectIdsQueryReturnType> {
    const projects = await this.prisma.project.findMany({
      where: { kind: ProjectKind.USER, status: ProjectStatus.CREATING },
      select: { id: true },
    });

    return projects.map((project) => project.id);
  }
}
