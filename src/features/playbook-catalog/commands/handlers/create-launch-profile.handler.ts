import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  CreateLaunchProfileCommand,
  type CreateLaunchProfileCommandReturnType,
} from '../impl/create-launch-profile.command.js';

@CommandHandler(CreateLaunchProfileCommand)
export class CreateLaunchProfileHandler implements ICommandHandler<
  CreateLaunchProfileCommand,
  CreateLaunchProfileCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: CreateLaunchProfileCommand): Promise<CreateLaunchProfileCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.launchProfiles,
      rowId: data.id,
      data: {
        pipelineId: data.pipelineId,
        status: data.status,
        profile: data.profile,
      },
    });

    return this.drafts.toRecord(created.row, revisionId, false);
  }
}
