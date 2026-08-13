import { QueryBus, QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { requireUserProject } from '../../project-request.js';
import { workPlanFromRow, WORK_PLAN_TABLE_ID } from '../../work-plan.js';
import { GetWorkPlanQuery, type GetWorkPlanQueryReturnType } from '../impl/get-work-plan.query.js';

@QueryHandler(GetWorkPlanQuery)
export class GetWorkPlanHandler implements IQueryHandler<
  GetWorkPlanQuery,
  GetWorkPlanQueryReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetWorkPlanQuery): Promise<GetWorkPlanQueryReturnType> {
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const row = await this.engine.getRow({
      revisionId,
      tableId: WORK_PLAN_TABLE_ID,
      rowId: data.id,
    });
    if (row === null) {
      return null;
    }

    return workPlanFromRow(row);
  }
}
