import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectTable } from '../../contracts/project-table.js';
import { ProjectError } from '../../contracts/project.errors.js';
import { ProjectDraftService } from '../../project-draft.service.js';
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
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateRequirementCommand): Promise<UpdateRequirementCommandReturnType> {
    const { projectId, id, ...row } = data;
    const revisionId = await this.drafts.getDraftRevisionId(projectId);
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: ProjectTable.requirement,
      rowId: id,
      data: row,
    });
    if (updated.row === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    return this.drafts.toRecord(updated.row);
  }
}
