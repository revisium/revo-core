import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogError } from '../../contracts/catalog.errors.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  UpdateMethodDocumentCommand,
  type UpdateMethodDocumentCommandReturnType,
} from '../impl/update-method-document.command.js';

@CommandHandler(UpdateMethodDocumentCommand)
export class UpdateMethodDocumentHandler implements ICommandHandler<
  UpdateMethodDocumentCommand,
  UpdateMethodDocumentCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: UpdateMethodDocumentCommand): Promise<UpdateMethodDocumentCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.methodDocuments,
      rowId: data.id,
      data: {
        playbookId: data.playbookId,
        kind: data.kind,
        body: data.body,
      },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return toCatalogRecord(updated.row, revisionId, false);
  }
}
