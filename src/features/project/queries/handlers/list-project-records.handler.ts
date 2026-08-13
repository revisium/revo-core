import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import {
  ListProjectRecordsQuery,
  type ListProjectRecordsQueryReturnType,
} from '../impl/list-project-records.query.js';

@QueryHandler(ListProjectRecordsQuery)
export class ListProjectRecordsHandler implements IQueryHandler<
  ListProjectRecordsQuery,
  ListProjectRecordsQueryReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListProjectRecordsQuery): Promise<ListProjectRecordsQueryReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const rows =
      data.after === undefined
        ? await this.engine.getRows({
            revisionId,
            tableId: data.tableId,
            first: data.first,
          })
        : await this.engine.getRows({
            revisionId,
            tableId: data.tableId,
            first: data.first,
            after: data.after,
          });

    return {
      edges: rows.edges.map((edge) => ({
        cursor: edge.cursor,
        node: { id: edge.node.id, data: edge.node.data },
      })),
      pageInfo: {
        hasNextPage: rows.pageInfo.hasNextPage,
        hasPreviousPage: rows.pageInfo.hasPreviousPage,
        ...(rows.pageInfo.startCursor === undefined
          ? {}
          : { startCursor: rows.pageInfo.startCursor }),
        ...(rows.pageInfo.endCursor === undefined ? {} : { endCursor: rows.pageInfo.endCursor }),
      },
      totalCount: rows.totalCount,
    };
  }
}
