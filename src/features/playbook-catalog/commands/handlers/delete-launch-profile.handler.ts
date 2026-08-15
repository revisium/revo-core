import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  DeleteLaunchProfileCommand,
  type DeleteLaunchProfileCommandReturnType,
} from '../impl/delete-launch-profile.command.js';

@CommandHandler(DeleteLaunchProfileCommand)
export class DeleteLaunchProfileHandler implements ICommandHandler<
  DeleteLaunchProfileCommand,
  DeleteLaunchProfileCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: DeleteLaunchProfileCommand): Promise<DeleteLaunchProfileCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.launchProfiles,
      rowId: data.id,
    });

    return true;
  }
}
