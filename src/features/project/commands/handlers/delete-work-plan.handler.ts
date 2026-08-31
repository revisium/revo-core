import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectTable } from '../../contracts/project-table.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import {
  DeleteWorkPlanCommand,
  type DeleteWorkPlanCommandReturnType,
} from '../impl/delete-work-plan.command.js';

@CommandHandler(DeleteWorkPlanCommand)
export class DeleteWorkPlanHandler implements ICommandHandler<
  DeleteWorkPlanCommand,
  DeleteWorkPlanCommandReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteWorkPlanCommand): Promise<DeleteWorkPlanCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    await this.engine.removeRow({
      revisionId,
      tableId: ProjectTable.workPlan,
      rowId: data.id,
    });
    return true;
  }
}
