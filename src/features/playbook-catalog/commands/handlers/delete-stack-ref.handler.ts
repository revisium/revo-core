import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  DeleteStackRefCommand,
  type DeleteStackRefCommandReturnType,
} from '../impl/delete-stack-ref.command.js';

@CommandHandler(DeleteStackRefCommand)
export class DeleteStackRefHandler implements ICommandHandler<
  DeleteStackRefCommand,
  DeleteStackRefCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: DeleteStackRefCommand): Promise<DeleteStackRefCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.stackRefs,
      rowId: data.id,
    });

    return true;
  }
}
