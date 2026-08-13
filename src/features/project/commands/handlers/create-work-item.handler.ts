import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { requireRecordId, requireUserProject } from '../../project-request.js';
import { workItemFromRow, workItemRowData, WORK_ITEM_TABLE_ID } from '../../work-item.js';
import {
  CreateWorkItemCommand,
  type CreateWorkItemCommandReturnType,
} from '../impl/create-work-item.command.js';

@CommandHandler(CreateWorkItemCommand)
export class CreateWorkItemHandler implements ICommandHandler<
  CreateWorkItemCommand,
  CreateWorkItemCommandReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateWorkItemCommand): Promise<CreateWorkItemCommandReturnType> {
    requireRecordId(data.id);
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const created = await this.engine.createRow({
      revisionId,
      tableId: WORK_ITEM_TABLE_ID,
      rowId: data.id,
      data: workItemRowData(data),
    });

    return workItemFromRow(created.row);
  }
}
