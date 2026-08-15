import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: CreateStackCommand): Promise<CreateStackCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.stacks,
      rowId: data.id,
      data: { playbookId: data.playbookId, body: data.body },
    });

    return this.drafts.toRecord(created.row, revisionId, false, CatalogTable.stacks);
  }
}
