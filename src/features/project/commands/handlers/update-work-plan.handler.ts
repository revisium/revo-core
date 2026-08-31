import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectTable } from '../../contracts/project-table.js';
import { ProjectError } from '../../contracts/project.errors.js';
import { ProjectDraftService } from '../../project-draft.service.js';
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
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateWorkPlanCommand): Promise<UpdateWorkPlanCommandReturnType> {
    const { projectId, id, ...row } = data;
    const revisionId = await this.drafts.getDraftRevisionId(projectId);
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: ProjectTable.workPlan,
      rowId: id,
      data: row,
    });
    if (updated.row === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    return this.drafts.toRecord(updated.row);
  }
}
