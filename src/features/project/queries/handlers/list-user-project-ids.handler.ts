import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { ProjectKind } from '../../../../__generated__/client/enums.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  ListUserProjectIdsQuery,
  type ListUserProjectIdsQueryReturnType,
} from '../impl/list-user-project-ids.query.js';

@QueryHandler(ListUserProjectIdsQuery)
export class ListUserProjectIdsHandler implements IQueryHandler<
  ListUserProjectIdsQuery,
  ListUserProjectIdsQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<ListUserProjectIdsQueryReturnType> {
    const projects = await this.prisma.project.findMany({
      where: { kind: ProjectKind.USER },
      select: { id: true },
    });

    return projects.map((project) => project.id);
  }
}
