import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { enginePageArgs } from '../../commands/utils/getOffsetPagination.js';
import { ProjectTable } from '../../contracts/project-table.js';
import { ProjectDraftService } from '../../project-draft.service.js';
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
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListWorkItemsQuery): Promise<ListWorkItemsQueryReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const rows = await this.engine.getRows({
      revisionId,
      tableId: ProjectTable.workItem,
      ...enginePageArgs(data),
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
