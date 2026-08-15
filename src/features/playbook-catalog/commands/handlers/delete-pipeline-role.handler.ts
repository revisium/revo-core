import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  DeletePipelineRoleCommand,
  type DeletePipelineRoleCommandReturnType,
} from '../impl/delete-pipeline-role.command.js';

@CommandHandler(DeletePipelineRoleCommand)
export class DeletePipelineRoleHandler implements ICommandHandler<
  DeletePipelineRoleCommand,
  DeletePipelineRoleCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeletePipelineRoleCommand): Promise<DeletePipelineRoleCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.pipelineRoles,
      rowId: data.id,
    });

    return true;
  }
}
