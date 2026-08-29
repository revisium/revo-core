import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  CreateStackCommand,
  type CreateStackCommandReturnType,
} from '../impl/create-stack.command.js';

@CommandHandler(CreateStackCommand)
export class CreateStackHandler implements ICommandHandler<
  CreateStackCommand,
  CreateStackCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateStackCommand): Promise<CreateStackCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.stacks,
      rowId: data.id,
      data: { playbookId: data.playbookId, body: data.body },
    });

    return toCatalogRecord(created.row, revisionId, false);
  }
}
