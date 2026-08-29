import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  CreateRoleRefCommand,
  type CreateRoleRefCommandReturnType,
} from '../impl/create-role-ref.command.js';

@CommandHandler(CreateRoleRefCommand)
export class CreateRoleRefHandler implements ICommandHandler<
  CreateRoleRefCommand,
  CreateRoleRefCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateRoleRefCommand): Promise<CreateRoleRefCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.roleRefs,
      rowId: data.id,
      data: { roleId: data.roleId, body: data.body },
    });

    return toCatalogRecord(created.row, revisionId, false);
  }
}
