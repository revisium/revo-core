import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { GetWorkPlanQuery, type GetWorkPlanQueryReturnType } from '../impl/get-work-plan.query.js';

@QueryHandler(GetWorkPlanQuery)
export class GetWorkPlanHandler implements IQueryHandler<
  GetWorkPlanQuery,
  GetWorkPlanQueryReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetWorkPlanQuery): Promise<GetWorkPlanQueryReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const row = await this.engine.getRow({
      revisionId,
      tableId: 'WorkPlan',
      rowId: data.id,
    });
    if (row === null) {
      return null;
    }

    return this.drafts.toRecord(row);
  }
}
