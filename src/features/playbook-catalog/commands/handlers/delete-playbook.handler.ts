import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  DeletePlaybookCommand,
  type DeletePlaybookCommandReturnType,
} from '../impl/delete-playbook.command.js';

@CommandHandler(DeletePlaybookCommand)
export class DeletePlaybookHandler implements ICommandHandler<
  DeletePlaybookCommand,
  DeletePlaybookCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeletePlaybookCommand): Promise<DeletePlaybookCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.playbooks,
      rowId: data.id,
    });

    return true;
  }
}
