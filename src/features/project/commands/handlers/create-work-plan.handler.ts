import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { requireRecordId, requireUserProject } from '../../project-request.js';
import { workPlanFromRow, workPlanRowData, WORK_PLAN_TABLE_ID } from '../../work-plan.js';
import {
  CreateWorkPlanCommand,
  type CreateWorkPlanCommandReturnType,
} from '../impl/create-work-plan.command.js';

@CommandHandler(CreateWorkPlanCommand)
export class CreateWorkPlanHandler implements ICommandHandler<
  CreateWorkPlanCommand,
  CreateWorkPlanCommandReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateWorkPlanCommand): Promise<CreateWorkPlanCommandReturnType> {
    requireRecordId(data.id);
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const created = await this.engine.createRow({
      revisionId,
      tableId: WORK_PLAN_TABLE_ID,
      rowId: data.id,
      data: workPlanRowData(data),
    });

    return workPlanFromRow(created.row);
  }
}
