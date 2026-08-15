import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  DeleteSharedReferenceCommand,
  type DeleteSharedReferenceCommandReturnType,
} from '../impl/delete-shared-reference.command.js';

@CommandHandler(DeleteSharedReferenceCommand)
export class DeleteSharedReferenceHandler implements ICommandHandler<
  DeleteSharedReferenceCommand,
  DeleteSharedReferenceCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: DeleteSharedReferenceCommand): Promise<DeleteSharedReferenceCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.sharedReferences,
      rowId: data.id,
    });

    return true;
  }
}
