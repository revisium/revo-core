import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdatePlaybookCommand): Promise<UpdatePlaybookCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.playbooks,
      rowId: data.id,
      data: { name: data.name },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(updated.row, revisionId, false);
  }
}
