import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: CreateMethodDocumentCommand): Promise<CreateMethodDocumentCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
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

    return toCatalogRecord(created.row, revisionId, false);
  }
}
