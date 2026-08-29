import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeletePipelineRoleCommand): Promise<DeletePipelineRoleCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.pipelineRoles,
      rowId: data.id,
    });

    return true;
  }
}
