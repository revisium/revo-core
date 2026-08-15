import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
import {
  UpdateStackRefCommand,
  type UpdateStackRefCommandReturnType,
} from '../impl/update-stack-ref.command.js';

@CommandHandler(UpdateStackRefCommand)
export class UpdateStackRefHandler implements ICommandHandler<
  UpdateStackRefCommand,
  UpdateStackRefCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: UpdateStackRefCommand): Promise<UpdateStackRefCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.stackRefs,
      rowId: data.id,
      data: { stackId: data.stackId, body: data.body },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(updated.row, revisionId, false, CatalogTable.stackRefs);
  }
}
