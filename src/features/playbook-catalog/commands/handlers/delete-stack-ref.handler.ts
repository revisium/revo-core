import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  DeleteStackRefCommand,
  type DeleteStackRefCommandReturnType,
} from '../impl/delete-stack-ref.command.js';

@CommandHandler(DeleteStackRefCommand)
export class DeleteStackRefHandler implements ICommandHandler<
  DeleteStackRefCommand,
  DeleteStackRefCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteStackRefCommand): Promise<DeleteStackRefCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.stackRefs,
      rowId: data.id,
    });

    return true;
  }
}
