import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { Prisma } from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  GetProjectWorkspaceSummariesQuery,
  type GetProjectWorkspaceSummariesQueryReturnType,
} from '../impl/get-project-workspace-summaries.query.js';

type SummaryRow = {
  projectId: string;
  name: string;
  type: 'folder' | 'repository';
  workspaceCount: number;
};

@QueryHandler(GetProjectWorkspaceSummariesQuery)
export class GetProjectWorkspaceSummariesHandler implements IQueryHandler<
  GetProjectWorkspaceSummariesQuery,
  GetProjectWorkspaceSummariesQueryReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  async execute({
    data,
  }: GetProjectWorkspaceSummariesQuery): Promise<GetProjectWorkspaceSummariesQueryReturnType> {
    const summaries: GetProjectWorkspaceSummariesQueryReturnType = Object.fromEntries(
      data.projectIds.map((id) => [id, { workspaces: [], workspaceCount: 0 }]),
    );

    if (data.projectIds.length === 0) {
      return summaries;
    }

    const rows = await this.transactions.getTransactionOrPrisma().$queryRaw<
      SummaryRow[]
    >(Prisma.sql`
      SELECT "projectId", "name", "type", "workspaceCount"
      FROM (
        SELECT
          "projectId", "name", "type",
          COUNT(*) OVER (PARTITION BY "projectId")::int AS "workspaceCount",
          ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "name", "id") AS rank
        FROM "workspaces"
        WHERE "projectId" IN (${Prisma.join(data.projectIds)}) AND "isArchived" = false
      ) ranked
      WHERE rank <= 3
      ORDER BY "projectId", rank
    `);

    for (const row of rows) {
      const summary = summaries[row.projectId];

      if (summary === undefined) {
        continue;
      }

      summary.workspaces.push({ name: row.name, type: row.type });
      summary.workspaceCount = row.workspaceCount;
    }

    return summaries;
  }
}
