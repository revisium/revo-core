import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  DeletePipelineCommand,
  type DeletePipelineCommandReturnType,
} from '../impl/delete-pipeline.command.js';

@CommandHandler(DeletePipelineCommand)
export class DeletePipelineHandler implements ICommandHandler<
  DeletePipelineCommand,
  DeletePipelineCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeletePipelineCommand): Promise<DeletePipelineCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.pipelines,
      rowId: data.id,
    });

    return true;
  }
}
