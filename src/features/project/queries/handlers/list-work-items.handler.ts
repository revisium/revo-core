import { QueryBus, QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { requirePageSize, requireUserProject } from '../../project-request.js';
import { workItemFromRow, WORK_ITEM_TABLE_ID } from '../../work-item.js';
import {
  ListWorkItemsQuery,
  type ListWorkItemsQueryReturnType,
} from '../impl/list-work-items.query.js';

@QueryHandler(ListWorkItemsQuery)
export class ListWorkItemsHandler implements IQueryHandler<
  ListWorkItemsQuery,
  ListWorkItemsQueryReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListWorkItemsQuery): Promise<ListWorkItemsQueryReturnType> {
    requirePageSize(data.first);
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const rows =
      data.after === undefined
        ? await this.engine.getRows({
            revisionId,
            tableId: WORK_ITEM_TABLE_ID,
            first: data.first,
          })
        : await this.engine.getRows({
            revisionId,
            tableId: WORK_ITEM_TABLE_ID,
            first: data.first,
            after: data.after,
          });

    return {
      ...rows,
      edges: rows.edges.map((edge) => ({
        cursor: edge.cursor,
        node: workItemFromRow(edge.node),
      })),
    };
  }
}
