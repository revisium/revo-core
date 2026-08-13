import { NotFoundException } from '@nestjs/common';
import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { ProjectError } from '../../project-errors.js';
import { requireUserProject } from '../../project-request.js';
import { WORK_ITEM_TABLE_ID } from '../../work-item.js';
import {
  DeleteWorkItemCommand,
  type DeleteWorkItemCommandReturnType,
} from '../impl/delete-work-item.command.js';

@CommandHandler(DeleteWorkItemCommand)
export class DeleteWorkItemHandler implements ICommandHandler<
  DeleteWorkItemCommand,
  DeleteWorkItemCommandReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteWorkItemCommand): Promise<DeleteWorkItemCommandReturnType> {
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const existing = await this.engine.getRow({
      revisionId,
      tableId: WORK_ITEM_TABLE_ID,
      rowId: data.id,
    });
    if (existing === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    await this.engine.removeRow({
      revisionId,
      tableId: WORK_ITEM_TABLE_ID,
      rowId: data.id,
    });
    return true;
  }
}
