import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: DeleteLaunchProfileCommand): Promise<DeleteLaunchProfileCommandReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    await this.engine.removeRow({
      revisionId,
      tableId: CatalogTable.launchProfiles,
      rowId: data.id,
    });

    return true;
  }
}
