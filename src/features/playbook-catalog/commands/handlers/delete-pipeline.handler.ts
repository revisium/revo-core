import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeletePipelineCommand): Promise<DeletePipelineCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.pipelines,
      rowId: data.id,
    });

    return true;
  }
}
