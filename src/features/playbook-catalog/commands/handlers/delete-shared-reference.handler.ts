import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: DeleteSharedReferenceCommand): Promise<DeleteSharedReferenceCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.sharedReferences,
      rowId: data.id,
    });

    return true;
  }
}
