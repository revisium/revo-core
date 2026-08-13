import { NotFoundException } from '@nestjs/common';
import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { adrFromRow, adrRowData, ADR_TABLE_ID } from '../../adr.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import { ProjectError } from '../../project-errors.js';
import { requireRecordId, requireUserProject } from '../../project-request.js';
import { UpdateAdrCommand, type UpdateAdrCommandReturnType } from '../impl/update-adr.command.js';

@CommandHandler(UpdateAdrCommand)
export class UpdateAdrHandler implements ICommandHandler<
  UpdateAdrCommand,
  UpdateAdrCommandReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateAdrCommand): Promise<UpdateAdrCommandReturnType> {
    requireRecordId(data.id);
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const existing = await this.engine.getRow({
      revisionId,
      tableId: ADR_TABLE_ID,
      rowId: data.id,
    });
    if (existing === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    const updated = await this.engine.updateRow({
      revisionId,
      tableId: ADR_TABLE_ID,
      rowId: data.id,
      data: adrRowData(data),
    });
    if (updated.row === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    return adrFromRow(updated.row);
  }
}
