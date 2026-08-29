import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateRoleRefCommand): Promise<UpdateRoleRefCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.roleRefs,
      rowId: data.id,
      data: { roleId: data.roleId, body: data.body },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(updated.row, revisionId, false);
  }
}
