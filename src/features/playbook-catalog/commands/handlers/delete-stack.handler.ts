import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  DeleteStackCommand,
  type DeleteStackCommandReturnType,
} from '../impl/delete-stack.command.js';

@CommandHandler(DeleteStackCommand)
export class DeleteStackHandler implements ICommandHandler<
  DeleteStackCommand,
  DeleteStackCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteStackCommand): Promise<DeleteStackCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.stacks,
      rowId: data.id,
    });

    return true;
  }
}
