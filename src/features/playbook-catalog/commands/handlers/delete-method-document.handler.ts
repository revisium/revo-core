import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: DeleteMethodDocumentCommand): Promise<DeleteMethodDocumentCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.methodDocuments,
      rowId: data.id,
    });

    return true;
  }
}
