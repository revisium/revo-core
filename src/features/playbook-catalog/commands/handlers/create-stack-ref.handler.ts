import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  CreateStackRefCommand,
  type CreateStackRefCommandReturnType,
} from '../impl/create-stack-ref.command.js';

@CommandHandler(CreateStackRefCommand)
export class CreateStackRefHandler implements ICommandHandler<
  CreateStackRefCommand,
  CreateStackRefCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateStackRefCommand): Promise<CreateStackRefCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.stackRefs,
      rowId: data.id,
      data: { stackId: data.stackId, body: data.body },
    });

    return toCatalogRecord(created.row, revisionId, false);
  }
}
