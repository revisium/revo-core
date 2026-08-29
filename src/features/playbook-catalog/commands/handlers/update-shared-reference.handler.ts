import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogError } from '../../contracts/catalog.errors.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  UpdateSharedReferenceCommand,
  type UpdateSharedReferenceCommandReturnType,
} from '../impl/update-shared-reference.command.js';

@CommandHandler(UpdateSharedReferenceCommand)
export class UpdateSharedReferenceHandler implements ICommandHandler<
  UpdateSharedReferenceCommand,
  UpdateSharedReferenceCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: UpdateSharedReferenceCommand): Promise<UpdateSharedReferenceCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.sharedReferences,
      rowId: data.id,
      data: { playbookId: data.playbookId, body: data.body },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return toCatalogRecord(updated.row, revisionId, false);
  }
}
