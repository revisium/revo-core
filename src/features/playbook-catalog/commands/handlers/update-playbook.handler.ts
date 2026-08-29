import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogError } from '../../contracts/catalog.errors.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  UpdatePlaybookCommand,
  type UpdatePlaybookCommandReturnType,
} from '../impl/update-playbook.command.js';

@CommandHandler(UpdatePlaybookCommand)
export class UpdatePlaybookHandler implements ICommandHandler<
  UpdatePlaybookCommand,
  UpdatePlaybookCommandReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdatePlaybookCommand): Promise<UpdatePlaybookCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.playbooks,
      rowId: data.id,
      data: { name: data.name },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return toCatalogRecord(updated.row, revisionId, false);
  }
}
