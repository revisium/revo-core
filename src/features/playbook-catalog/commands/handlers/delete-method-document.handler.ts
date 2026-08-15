import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  DeleteMethodDocumentCommand,
  type DeleteMethodDocumentCommandReturnType,
} from '../impl/delete-method-document.command.js';

@CommandHandler(DeleteMethodDocumentCommand)
export class DeleteMethodDocumentHandler implements ICommandHandler<
  DeleteMethodDocumentCommand,
  DeleteMethodDocumentCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: DeleteMethodDocumentCommand): Promise<DeleteMethodDocumentCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.methodDocuments,
      rowId: data.id,
    });

    return true;
  }
}
