import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { ProjectError } from '../../project-errors.js';
import {
  UpdateProjectRecordCommand,
  type UpdateProjectRecordCommandReturnType,
} from '../impl/update-project-record.command.js';

@CommandHandler(UpdateProjectRecordCommand)
export class UpdateProjectRecordHandler implements ICommandHandler<
  UpdateProjectRecordCommand,
  UpdateProjectRecordCommandReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: UpdateProjectRecordCommand): Promise<UpdateProjectRecordCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const existing = await this.engine.getRow({
      revisionId,
      tableId: data.tableId,
      rowId: data.rowId,
    });
    if (existing === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    const updated = await this.engine.updateRow({
      revisionId,
      tableId: data.tableId,
      rowId: data.rowId,
      data: data.data,
    });
    if (updated.row === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    return {
      id: updated.row.id,
      data: updated.row.data,
    };
  }
}
