import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogError } from '../../contracts/catalog.errors.js';
import {
  decodeLaunchProfileRecordData,
  encodeCatalogDefinition,
} from '../../engine/catalog-record.codec.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: UpdateLaunchProfileCommand): Promise<UpdateLaunchProfileCommandReturnType> {
    const profile = encodeCatalogDefinition(data.profile, 'profile');
    const revisionId = await this.revisions.getDraftRevisionId();
    const updated = await this.engine.updateRow({
      revisionId,
      tableId: CatalogTable.launchProfiles,
      rowId: data.id,
      data: {
        pipelineId: data.pipelineId,
        status: data.status,
        profile,
      },
    });

    if (updated.row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return toCatalogRecord(
      updated.row,
      revisionId,
      false,
      decodeLaunchProfileRecordData(updated.row.data),
    );
  }
}
