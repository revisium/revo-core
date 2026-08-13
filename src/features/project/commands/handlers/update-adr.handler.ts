import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectError } from '../../constants/project.constants.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import { UpdateAdrCommand, type UpdateAdrCommandReturnType } from '../impl/update-adr.command.js';

@CommandHandler(UpdateAdrCommand)
export class UpdateAdrHandler implements ICommandHandler<
  UpdateAdrCommand,
  UpdateAdrCommandReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateAdrCommand): Promise<UpdateAdrCommandReturnType> {
    const { projectId, id, ...row } = data;
    const revisionId = await this.drafts.getDraftRevisionId(projectId);
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: 'ADR',
      rowId: id,
      data: row,
    });
    if (updated.row === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    return this.drafts.toRecord(updated.row);
  }
}
