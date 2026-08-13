import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { requireRecordId, requireUserProject } from '../../project-request.js';
import { requirementFromRow, requirementRowData, REQUIREMENT_TABLE_ID } from '../../requirement.js';
import {
  CreateRequirementCommand,
  type CreateRequirementCommandReturnType,
} from '../impl/create-requirement.command.js';

@CommandHandler(CreateRequirementCommand)
export class CreateRequirementHandler implements ICommandHandler<
  CreateRequirementCommand,
  CreateRequirementCommandReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateRequirementCommand): Promise<CreateRequirementCommandReturnType> {
    requireRecordId(data.id);
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const created = await this.engine.createRow({
      revisionId,
      tableId: REQUIREMENT_TABLE_ID,
      rowId: data.id,
      data: requirementRowData(data),
    });

    return requirementFromRow(created.row);
  }
}
