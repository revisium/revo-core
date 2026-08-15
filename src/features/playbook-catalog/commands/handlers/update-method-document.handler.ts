import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: UpdateMethodDocumentCommand): Promise<UpdateMethodDocumentCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
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

    return this.drafts.toRecord(updated.row, revisionId, false, CatalogTable.methodDocuments);
  }
}
