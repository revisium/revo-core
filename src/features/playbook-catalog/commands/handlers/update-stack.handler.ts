import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateStackCommand): Promise<UpdateStackCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.stacks,
      rowId: data.id,
      data: { playbookId: data.playbookId, body: data.body },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(updated.row, revisionId, false, CatalogTable.stacks);
  }
}
