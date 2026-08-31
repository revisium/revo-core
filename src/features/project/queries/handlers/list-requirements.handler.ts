import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { enginePageArgs } from '../../commands/utils/getOffsetPagination.js';
import { ProjectTable } from '../../contracts/project-table.js';
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
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const rows = await this.engine.getRows({
      revisionId,
      tableId: ProjectTable.requirement,
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
