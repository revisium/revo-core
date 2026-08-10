import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  GetReviewThreadsQuery,
  type GetReviewThreadsQueryReturnType,
} from '../impl/get-review-threads.query.js';

@QueryHandler(GetReviewThreadsQuery)
export class GetReviewThreadsHandler implements IQueryHandler<
  GetReviewThreadsQuery,
  GetReviewThreadsQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  execute({ data }: GetReviewThreadsQuery): Promise<GetReviewThreadsQueryReturnType> {
    const where: Prisma.ReviewThreadWhereInput = {
      scopeKey: data.scopeKey,
      ...(data.subjectKey === undefined ? {} : { subjectKey: data.subjectKey }),
      ...(data.contextKey === undefined ? {} : { contextKey: data.contextKey }),
      ...(data.resolved === undefined ? {} : { resolvedAt: data.resolved ? { not: null } : null }),
    };

    return this.prisma.reviewThread.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
}
