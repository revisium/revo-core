import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreatePlaybookCommand): Promise<CreatePlaybookCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.playbooks,
      rowId: data.id,
      data: { name: data.name },
    });

    return toCatalogRecord(created.row, revisionId, false);
  }
}
