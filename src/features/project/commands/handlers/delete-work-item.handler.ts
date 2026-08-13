import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
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
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteWorkItemCommand): Promise<DeleteWorkItemCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    await this.engine.removeRow({
      revisionId,
      tableId: 'WorkItem',
      rowId: data.id,
    });
    return true;
  }
}
