import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectTable } from '../../constants/project.constants.js';
import { ProjectDraftService } from '../../project-draft.service.js';
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
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateWorkPlanCommand): Promise<CreateWorkPlanCommandReturnType> {
    const { projectId, id, ...row } = data;
    const revisionId = await this.drafts.getDraftRevisionId(projectId);
    const created = await this.engine.createRow({
      revisionId,
      tableId: ProjectTable.workPlan,
      rowId: id,
      data: row,
    });

    return this.drafts.toRecord(created.row);
  }
}
