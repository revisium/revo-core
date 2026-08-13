import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { ProjectKind } from '../../../../__generated__/client/enums.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  GetUserProjectQuery,
  type GetUserProjectQueryReturnType,
} from '../impl/get-user-project.query.js';

@QueryHandler(GetUserProjectQuery)
export class GetUserProjectHandler implements IQueryHandler<
  GetUserProjectQuery,
  GetUserProjectQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ data }: GetUserProjectQuery): Promise<GetUserProjectQueryReturnType> {
    const project = await this.prisma.project.findFirst({
      where: { id: data.id, kind: ProjectKind.USER },
      select: { id: true, name: true },
    });

    return project;
  }
}
