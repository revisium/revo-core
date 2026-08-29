import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  CreateSharedReferenceCommand,
  type CreateSharedReferenceCommandReturnType,
} from '../impl/create-shared-reference.command.js';

@CommandHandler(CreateSharedReferenceCommand)
export class CreateSharedReferenceHandler implements ICommandHandler<
  CreateSharedReferenceCommand,
  CreateSharedReferenceCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: CreateSharedReferenceCommand): Promise<CreateSharedReferenceCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.sharedReferences,
      rowId: data.id,
      data: { playbookId: data.playbookId, body: data.body },
    });

    return toCatalogRecord(created.row, revisionId, false);
  }
}
