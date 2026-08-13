import { QueryBus, QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { adrFromRow, ADR_TABLE_ID } from '../../adr.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import { requirePageSize, requireUserProject } from '../../project-request.js';
import { ListAdrsQuery, type ListAdrsQueryReturnType } from '../impl/list-adrs.query.js';

@QueryHandler(ListAdrsQuery)
export class ListAdrsHandler implements IQueryHandler<ListAdrsQuery, ListAdrsQueryReturnType> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListAdrsQuery): Promise<ListAdrsQueryReturnType> {
    requirePageSize(data.first);
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const rows =
      data.after === undefined
        ? await this.engine.getRows({
            revisionId,
            tableId: ADR_TABLE_ID,
            first: data.first,
          })
        : await this.engine.getRows({
            revisionId,
            tableId: ADR_TABLE_ID,
            first: data.first,
            after: data.after,
          });

    return {
      ...rows,
      edges: rows.edges.map((edge) => ({
        cursor: edge.cursor,
        node: adrFromRow(edge.node),
      })),
    };
  }
}
