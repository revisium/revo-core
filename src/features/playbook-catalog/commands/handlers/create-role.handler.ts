import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  CreateRoleCommand,
  type CreateRoleCommandReturnType,
} from '../impl/create-role.command.js';

@CommandHandler(CreateRoleCommand)
export class CreateRoleHandler implements ICommandHandler<
  CreateRoleCommand,
  CreateRoleCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateRoleCommand): Promise<CreateRoleCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.roles,
      rowId: data.id,
      data: { playbookId: data.playbookId, body: data.body },
    });

    return toCatalogRecord(created.row, revisionId, false);
  }
}
