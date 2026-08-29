import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  DeleteRoleRefCommand,
  type DeleteRoleRefCommandReturnType,
} from '../impl/delete-role-ref.command.js';

@CommandHandler(DeleteRoleRefCommand)
export class DeleteRoleRefHandler implements ICommandHandler<
  DeleteRoleRefCommand,
  DeleteRoleRefCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteRoleRefCommand): Promise<DeleteRoleRefCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.roleRefs,
      rowId: data.id,
    });

    return true;
  }
}
