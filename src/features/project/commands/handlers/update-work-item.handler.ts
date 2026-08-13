import { NotFoundException } from '@nestjs/common';
import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { ProjectError } from '../../project-errors.js';
import { requireRecordId, requireUserProject } from '../../project-request.js';
import { workItemFromRow, workItemRowData, WORK_ITEM_TABLE_ID } from '../../work-item.js';
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
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateWorkItemCommand): Promise<UpdateWorkItemCommandReturnType> {
    requireRecordId(data.id);
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

    const updated = await this.engine.updateRow({
      revisionId,
      tableId: WORK_ITEM_TABLE_ID,
      rowId: data.id,
      data: workItemRowData(data),
    });
    if (updated.row === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    return workItemFromRow(updated.row);
  }
}
