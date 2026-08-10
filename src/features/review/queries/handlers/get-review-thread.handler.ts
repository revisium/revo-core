import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  GetReviewThreadQuery,
  type GetReviewThreadQueryReturnType,
} from '../impl/get-review-thread.query.js';

@QueryHandler(GetReviewThreadQuery)
export class GetReviewThreadHandler implements IQueryHandler<
  GetReviewThreadQuery,
  GetReviewThreadQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ data }: GetReviewThreadQuery): Promise<GetReviewThreadQueryReturnType> {
    const thread = await this.prisma.reviewThread.findUnique({
      where: { id: data.threadId },
      include: {
        messages: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (thread === null) {
      throw new NotFoundException(`Review thread ${data.threadId} was not found.`);
    }

    return thread;
  }
}
