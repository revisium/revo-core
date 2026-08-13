import { QueryBus, QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { requirePageSize, requireUserProject } from '../../project-request.js';
import { workPlanFromRow, WORK_PLAN_TABLE_ID } from '../../work-plan.js';
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
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListWorkPlansQuery): Promise<ListWorkPlansQueryReturnType> {
    requirePageSize(data.first);
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const rows =
      data.after === undefined
        ? await this.engine.getRows({
            revisionId,
            tableId: WORK_PLAN_TABLE_ID,
            first: data.first,
          })
        : await this.engine.getRows({
            revisionId,
            tableId: WORK_PLAN_TABLE_ID,
            first: data.first,
            after: data.after,
          });

    return {
      ...rows,
      edges: rows.edges.map((edge) => ({
        cursor: edge.cursor,
        node: workPlanFromRow(edge.node),
      })),
    };
  }
}
