import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogError } from '../../contracts/catalog.errors.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  UpdateRoleRefCommand,
  type UpdateRoleRefCommandReturnType,
} from '../impl/update-role-ref.command.js';

@CommandHandler(UpdateRoleRefCommand)
export class UpdateRoleRefHandler implements ICommandHandler<
  UpdateRoleRefCommand,
  UpdateRoleRefCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateRoleRefCommand): Promise<UpdateRoleRefCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.roleRefs,
      rowId: data.id,
      data: { roleId: data.roleId, body: data.body },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return toCatalogRecord(updated.row, revisionId, false);
  }
}
