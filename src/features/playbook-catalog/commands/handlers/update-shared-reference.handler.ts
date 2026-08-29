import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: UpdateSharedReferenceCommand): Promise<UpdateSharedReferenceCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.sharedReferences,
      rowId: data.id,
      data: { playbookId: data.playbookId, body: data.body },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(updated.row, revisionId, false);
  }
}
