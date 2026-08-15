import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService, type InputJsonValue } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
import {
  UpdateLaunchProfileCommand,
  type UpdateLaunchProfileCommandReturnType,
} from '../impl/update-launch-profile.command.js';

@CommandHandler(UpdateLaunchProfileCommand)
export class UpdateLaunchProfileHandler implements ICommandHandler<
  UpdateLaunchProfileCommand,
  UpdateLaunchProfileCommandReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: UpdateLaunchProfileCommand): Promise<UpdateLaunchProfileCommandReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.launchProfiles,
      rowId: data.id,
      data: {
        pipelineId: data.pipelineId,
        status: data.status,
        bindings: data.bindings,
      } as InputJsonValue,
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(updated.row, revisionId, false, CatalogTable.launchProfiles);
  }
}
