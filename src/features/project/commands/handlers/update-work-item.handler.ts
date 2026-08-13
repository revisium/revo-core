import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectError, ProjectTable } from '../../constants/project.constants.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import {
  UpdateWorkItemCommand,
  type UpdateWorkItemCommandReturnType,
} from '../impl/update-work-item.command.js';

@CommandHandler(UpdateWorkItemCommand)
export class UpdateWorkItemHandler implements ICommandHandler<
  UpdateWorkItemCommand,
  UpdateWorkItemCommandReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateWorkItemCommand): Promise<UpdateWorkItemCommandReturnType> {
    const { projectId, id, ...row } = data;
    const revisionId = await this.drafts.getDraftRevisionId(projectId);
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: ProjectTable.workItem,
      rowId: id,
      data: row,
    });
    if (updated.row === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    return this.drafts.toRecord(updated.row);
  }
}
