import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  DeleteRoleCommand,
  type DeleteRoleCommandReturnType,
} from '../impl/delete-role.command.js';

@CommandHandler(DeleteRoleCommand)
export class DeleteRoleHandler implements ICommandHandler<
  DeleteRoleCommand,
  DeleteRoleCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteRoleCommand): Promise<DeleteRoleCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.roles,
      rowId: data.id,
    });

    return true;
  }
}
