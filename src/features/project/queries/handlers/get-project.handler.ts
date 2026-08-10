import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { GetProjectQuery, type GetProjectQueryReturnType } from '../impl/get-project.query.js';

@QueryHandler(GetProjectQuery)
export class GetProjectHandler implements IQueryHandler<
  GetProjectQuery,
  GetProjectQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  execute({ data }: GetProjectQuery): Promise<GetProjectQueryReturnType> {
    return this.prisma.project.findUniqueOrThrow({
      where: { id: data.id },
    });
  }
}
