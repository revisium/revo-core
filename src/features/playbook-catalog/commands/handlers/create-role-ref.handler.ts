import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateRoleRefCommand): Promise<CreateRoleRefCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.roleRefs,
      rowId: data.id,
      data: { roleId: data.roleId, body: data.body },
    });

    return this.drafts.toRecord(created.row, revisionId, false, CatalogTable.roleRefs);
  }
}
