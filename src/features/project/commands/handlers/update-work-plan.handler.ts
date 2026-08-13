import { NotFoundException } from '@nestjs/common';
import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { ProjectError } from '../../project-errors.js';
import { requireRecordId, requireUserProject } from '../../project-request.js';
import { workPlanFromRow, workPlanRowData, WORK_PLAN_TABLE_ID } from '../../work-plan.js';
import {
  UpdateWorkPlanCommand,
  type UpdateWorkPlanCommandReturnType,
} from '../impl/update-work-plan.command.js';

@CommandHandler(UpdateWorkPlanCommand)
export class UpdateWorkPlanHandler implements ICommandHandler<
  UpdateWorkPlanCommand,
  UpdateWorkPlanCommandReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateWorkPlanCommand): Promise<UpdateWorkPlanCommandReturnType> {
    requireRecordId(data.id);
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const existing = await this.engine.getRow({
      revisionId,
      tableId: WORK_PLAN_TABLE_ID,
      rowId: data.id,
    });
    if (existing === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    const updated = await this.engine.updateRow({
      revisionId,
      tableId: WORK_PLAN_TABLE_ID,
      rowId: data.id,
      data: workPlanRowData(data),
    });
    if (updated.row === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    return workPlanFromRow(updated.row);
  }
}
