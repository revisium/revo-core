import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteRoleRefCommand): Promise<DeleteRoleRefCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.roleRefs,
      rowId: data.id,
    });

    return true;
  }
}
