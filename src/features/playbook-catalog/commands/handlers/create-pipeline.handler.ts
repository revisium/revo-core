import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import {
  decodePipelineRecordData,
  encodeCatalogDefinition,
} from '../../engine/catalog-record.codec.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreatePipelineCommand): Promise<CreatePipelineCommandReturnType> {
    const pipeline = encodeCatalogDefinition(data.pipeline, 'pipeline');
    const revisionId = await this.revisions.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.pipelines,
      rowId: data.id,
      data: {
        playbookId: data.playbookId,
        pipeline,
      },
    });

    return toCatalogRecord(
      created.row,
      revisionId,
      false,
      decodePipelineRecordData(created.row.data),
    );
  }
}
