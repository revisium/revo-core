import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import {
  ProjectKind,
  ProjectStatus as StoredProjectStatus,
} from '../../../../__generated__/client/enums.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { toPublicProjectStatus } from '../../contracts/project.enums.js';
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
      where: {
        id: data.id,
        kind: ProjectKind.USER,
        status: { not: StoredProjectStatus.CREATING },
      },
      select: { id: true, name: true, description: true, status: true },
    });

    if (project === null) {
      return null;
    }

    return { ...project, status: toPublicProjectStatus(project.status) };
  }
}
