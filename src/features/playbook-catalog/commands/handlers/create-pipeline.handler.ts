import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  CreatePipelineCommand,
  type CreatePipelineCommandReturnType,
} from '../impl/create-pipeline.command.js';

@CommandHandler(CreatePipelineCommand)
export class CreatePipelineHandler implements ICommandHandler<
  CreatePipelineCommand,
  CreatePipelineCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreatePipelineCommand): Promise<CreatePipelineCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.pipelines,
      rowId: data.id,
      data: { playbookId: data.playbookId, pipeline: data.pipeline },
    });

    return this.drafts.toRecord(created.row, revisionId, false);
  }
}
