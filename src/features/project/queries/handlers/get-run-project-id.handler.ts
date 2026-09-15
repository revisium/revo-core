import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  GetRunProjectIdQuery,
  type GetRunProjectIdQueryReturnType,
} from '../impl/get-run-project-id.query.js';

@QueryHandler(GetRunProjectIdQuery)
export class GetRunProjectIdHandler implements IQueryHandler<
  GetRunProjectIdQuery,
  GetRunProjectIdQueryReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  async execute({ data }: GetRunProjectIdQuery): Promise<GetRunProjectIdQueryReturnType> {
    const ownership = await this.transactions.getTransactionOrPrisma().projectRun.findUnique({
      where: { runId: data.runId },
      select: { projectId: true },
    });

    return ownership?.projectId ?? null;
  }
}
