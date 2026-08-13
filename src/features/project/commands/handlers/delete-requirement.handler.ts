import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import {
  DeleteRequirementCommand,
  type DeleteRequirementCommandReturnType,
} from '../impl/delete-requirement.command.js';

@CommandHandler(DeleteRequirementCommand)
export class DeleteRequirementHandler implements ICommandHandler<
  DeleteRequirementCommand,
  DeleteRequirementCommandReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteRequirementCommand): Promise<DeleteRequirementCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    await this.engine.removeRow({
      revisionId,
      tableId: 'Requirement',
      rowId: data.id,
    });
    return true;
  }
}
