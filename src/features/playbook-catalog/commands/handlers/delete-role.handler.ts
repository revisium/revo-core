import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteRoleCommand): Promise<DeleteRoleCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.roles,
      rowId: data.id,
    });

    return true;
  }
}
