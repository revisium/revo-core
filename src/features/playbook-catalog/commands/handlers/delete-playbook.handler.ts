import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeletePlaybookCommand): Promise<DeletePlaybookCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.playbooks,
      rowId: data.id,
    });

    return true;
  }
}
