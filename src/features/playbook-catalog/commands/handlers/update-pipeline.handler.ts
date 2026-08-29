import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
import {
  UpdatePipelineCommand,
  type UpdatePipelineCommandReturnType,
} from '../impl/update-pipeline.command.js';

@CommandHandler(UpdatePipelineCommand)
export class UpdatePipelineHandler implements ICommandHandler<
  UpdatePipelineCommand,
  UpdatePipelineCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdatePipelineCommand): Promise<UpdatePipelineCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.pipelines,
      rowId: data.id,
      data: { playbookId: data.playbookId, pipeline: data.pipeline },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(updated.row, revisionId, false);
  }
}
