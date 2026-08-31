import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { enginePageArgs } from '../../commands/utils/getOffsetPagination.js';
import { ProjectTable } from '../../contracts/project-table.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import {
  ListWorkPlansQuery,
  type ListWorkPlansQueryReturnType,
} from '../impl/list-work-plans.query.js';

@QueryHandler(ListWorkPlansQuery)
export class ListWorkPlansHandler implements IQueryHandler<
  ListWorkPlansQuery,
  ListWorkPlansQueryReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListWorkPlansQuery): Promise<ListWorkPlansQueryReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const rows = await this.engine.getRows({
      revisionId,
      tableId: ProjectTable.workPlan,
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
