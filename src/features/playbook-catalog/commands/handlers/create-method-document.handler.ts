import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  CreateMethodDocumentCommand,
  type CreateMethodDocumentCommandReturnType,
} from '../impl/create-method-document.command.js';

@CommandHandler(CreateMethodDocumentCommand)
export class CreateMethodDocumentHandler implements ICommandHandler<
  CreateMethodDocumentCommand,
  CreateMethodDocumentCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: CreateMethodDocumentCommand): Promise<CreateMethodDocumentCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.methodDocuments,
      rowId: data.id,
      data: {
        playbookId: data.playbookId,
        kind: data.kind,
        body: data.body,
      },
    });

    return this.drafts.toRecord(created.row, revisionId, false, CatalogTable.methodDocuments);
  }
}
