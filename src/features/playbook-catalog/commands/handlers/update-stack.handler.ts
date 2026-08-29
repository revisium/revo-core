import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogError } from '../../contracts/catalog.errors.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  UpdateStackCommand,
  type UpdateStackCommandReturnType,
} from '../impl/update-stack.command.js';

@CommandHandler(UpdateStackCommand)
export class UpdateStackHandler implements ICommandHandler<
  UpdateStackCommand,
  UpdateStackCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateStackCommand): Promise<UpdateStackCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.stacks,
      rowId: data.id,
      data: { playbookId: data.playbookId, body: data.body },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return toCatalogRecord(updated.row, revisionId, false);
  }
}
