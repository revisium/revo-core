import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  DeletePipelineSourceCommand,
  type DeletePipelineSourceCommandReturnType,
} from '../impl/delete-pipeline-source.command.js';

@CommandHandler(DeletePipelineSourceCommand)
export class DeletePipelineSourceHandler implements ICommandHandler<
  DeletePipelineSourceCommand,
  DeletePipelineSourceCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: DeletePipelineSourceCommand): Promise<DeletePipelineSourceCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.pipelineSources,
      rowId: data.id,
    });

    return true;
  }
}
