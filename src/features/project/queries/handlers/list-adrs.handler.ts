import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { pageSize } from '../../commands/utils/getOffsetPagination.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import { ListAdrsQuery, type ListAdrsQueryReturnType } from '../impl/list-adrs.query.js';

@QueryHandler(ListAdrsQuery)
export class ListAdrsHandler implements IQueryHandler<ListAdrsQuery, ListAdrsQueryReturnType> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListAdrsQuery): Promise<ListAdrsQueryReturnType> {
    const first = pageSize(data.first);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const rows =
      data.after === undefined
        ? await this.engine.getRows({ revisionId, tableId: 'ADR', first })
        : await this.engine.getRows({ revisionId, tableId: 'ADR', first, after: data.after });

    return {
      ...rows,
      edges: rows.edges.map((edge) => ({
        cursor: edge.cursor,
        node: this.drafts.toRecord(edge.node),
      })),
    };
  }
}
