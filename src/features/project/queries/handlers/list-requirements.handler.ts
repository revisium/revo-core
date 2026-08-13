import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { pageSize } from '../../commands/utils/getOffsetPagination.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import {
  ListRequirementsQuery,
  type ListRequirementsQueryReturnType,
} from '../impl/list-requirements.query.js';

@QueryHandler(ListRequirementsQuery)
export class ListRequirementsHandler implements IQueryHandler<
  ListRequirementsQuery,
  ListRequirementsQueryReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListRequirementsQuery): Promise<ListRequirementsQueryReturnType> {
    const first = pageSize(data.first);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const rows =
      data.after === undefined
        ? await this.engine.getRows({ revisionId, tableId: 'Requirement', first })
        : await this.engine.getRows({
            revisionId,
            tableId: 'Requirement',
            first,
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
