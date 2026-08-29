import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogError } from '../../contracts/catalog.errors.js';
import {
  decodePipelineRecordData,
  encodeCatalogDefinition,
} from '../../engine/catalog-record.codec.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdatePipelineCommand): Promise<UpdatePipelineCommandReturnType> {
    const pipeline = encodeCatalogDefinition(data.pipeline, 'pipeline');
    const revisionId = await this.revisions.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.pipelines,
      rowId: data.id,
      data: {
        playbookId: data.playbookId,
        pipeline,
      },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return toCatalogRecord(
      updated.row,
      revisionId,
      false,
      decodePipelineRecordData(updated.row.data),
    );
  }
}
