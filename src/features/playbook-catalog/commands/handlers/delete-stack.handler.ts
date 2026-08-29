import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  DeleteStackCommand,
  type DeleteStackCommandReturnType,
} from '../impl/delete-stack.command.js';

@CommandHandler(DeleteStackCommand)
export class DeleteStackHandler implements ICommandHandler<
  DeleteStackCommand,
  DeleteStackCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteStackCommand): Promise<DeleteStackCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.stacks,
      rowId: data.id,
    });

    return true;
  }
}
