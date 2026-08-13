import { NotFoundException } from '@nestjs/common';
import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ADR_TABLE_ID } from '../../adr.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import { ProjectError } from '../../project-errors.js';
import { requireUserProject } from '../../project-request.js';
import { DeleteAdrCommand, type DeleteAdrCommandReturnType } from '../impl/delete-adr.command.js';

@CommandHandler(DeleteAdrCommand)
export class DeleteAdrHandler implements ICommandHandler<
  DeleteAdrCommand,
  DeleteAdrCommandReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteAdrCommand): Promise<DeleteAdrCommandReturnType> {
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

    await this.engine.removeRow({
      revisionId,
      tableId: ADR_TABLE_ID,
      rowId: data.id,
    });
    return true;
  }
}
