import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectTable } from '../../contracts/project-table.js';
import { ProjectDraftService } from '../../project-draft.service.js';
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
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateWorkItemCommand): Promise<CreateWorkItemCommandReturnType> {
    const { projectId, id, ...row } = data;
    const revisionId = await this.drafts.getDraftRevisionId(projectId);
    const created = await this.engine.createRow({
      revisionId,
      tableId: ProjectTable.workItem,
      rowId: id,
      data: row,
    });

    return this.drafts.toRecord(created.row);
  }
}
