import { NotFoundException } from '@nestjs/common';
import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { ProjectError } from '../../project-errors.js';
import { requireRecordId, requireUserProject } from '../../project-request.js';
import { requirementFromRow, requirementRowData, REQUIREMENT_TABLE_ID } from '../../requirement.js';
import {
  UpdateRequirementCommand,
  type UpdateRequirementCommandReturnType,
} from '../impl/update-requirement.command.js';

@CommandHandler(UpdateRequirementCommand)
export class UpdateRequirementHandler implements ICommandHandler<
  UpdateRequirementCommand,
  UpdateRequirementCommandReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateRequirementCommand): Promise<UpdateRequirementCommandReturnType> {
    requireRecordId(data.id);
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const existing = await this.engine.getRow({
      revisionId,
      tableId: REQUIREMENT_TABLE_ID,
      rowId: data.id,
    });
    if (existing === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    const updated = await this.engine.updateRow({
      revisionId,
      tableId: REQUIREMENT_TABLE_ID,
      rowId: data.id,
      data: requirementRowData(data),
    });
    if (updated.row === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    return requirementFromRow(updated.row);
  }
}
