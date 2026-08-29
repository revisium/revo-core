import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  CreatePlaybookCommand,
  type CreatePlaybookCommandReturnType,
} from '../impl/create-playbook.command.js';

@CommandHandler(CreatePlaybookCommand)
export class CreatePlaybookHandler implements ICommandHandler<
  CreatePlaybookCommand,
  CreatePlaybookCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreatePlaybookCommand): Promise<CreatePlaybookCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.playbooks,
      rowId: data.id,
      data: { name: data.name },
    });

    return this.drafts.toRecord(created.row, revisionId, false);
  }
}
