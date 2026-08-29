import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateRoleCommand): Promise<CreateRoleCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.roles,
      rowId: data.id,
      data: { playbookId: data.playbookId, body: data.body },
    });

    return this.drafts.toRecord(created.row, revisionId, false);
  }
}
