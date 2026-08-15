import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  UpdatePipelineSourceCommand,
  type UpdatePipelineSourceCommandReturnType,
} from '../impl/update-pipeline-source.command.js';

@CommandHandler(UpdatePipelineSourceCommand)
export class UpdatePipelineSourceHandler implements ICommandHandler<
  UpdatePipelineSourceCommand,
  UpdatePipelineSourceCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: UpdatePipelineSourceCommand): Promise<UpdatePipelineSourceCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const existing = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.pipelineSources,
      rowId: data.id,
    });
    const rowData = { pipelineId: data.pipelineId, sourceJson: data.sourceJson };

    if (existing === null) {
      const created = await this.engine.createRow({
        revisionId,
        tableId: CatalogTable.pipelineSources,
        rowId: data.id,
        data: rowData,
      });

      return this.drafts.toRecord(created.row, revisionId, false, CatalogTable.pipelineSources);
    }

    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.pipelineSources,
      rowId: data.id,
      data: rowData,
    });

    return this.drafts.toRecord(
      updated.row ?? existing,
      revisionId,
      false,
      CatalogTable.pipelineSources,
    );
  }
}
