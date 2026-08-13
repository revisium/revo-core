import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { ListAdrsQuery, type ListAdrsQueryReturnType } from '../impl/list-adrs.query.js';

@QueryHandler(ListAdrsQuery)
export class ListAdrsHandler implements IQueryHandler<ListAdrsQuery, ListAdrsQueryReturnType> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListAdrsQuery): Promise<ListAdrsQueryReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const rows =
      data.after === undefined
        ? await this.engine.getRows({ revisionId, tableId: 'ADR', first: data.first })
        : await this.engine.getRows({
            revisionId,
            tableId: 'ADR',
            first: data.first,
            after: data.after,
          });

    return {
      ...rows,
      edges: rows.edges.map((edge) => ({
        cursor: edge.cursor,
        node: this.drafts.toRecord(edge.node),
      })),
    };
  }
}
