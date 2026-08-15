import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateStackRefCommand): Promise<CreateStackRefCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.stackRefs,
      rowId: data.id,
      data: { stackId: data.stackId, body: data.body },
    });

    return this.drafts.toRecord(created.row, revisionId, false, CatalogTable.stackRefs);
  }
}
