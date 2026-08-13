import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectTable } from '../../constants/project.constants.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import { DeleteAdrCommand, type DeleteAdrCommandReturnType } from '../impl/delete-adr.command.js';

@CommandHandler(DeleteAdrCommand)
export class DeleteAdrHandler implements ICommandHandler<
  DeleteAdrCommand,
  DeleteAdrCommandReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteAdrCommand): Promise<DeleteAdrCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    await this.engine.removeRow({
      revisionId,
      tableId: ProjectTable.adr,
      rowId: data.id,
    });
    return true;
  }
}
