import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import {
  decodeLaunchProfileRecordData,
  encodeCatalogDefinition,
} from '../../engine/catalog-record.codec.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({
    data,
  }: CreateLaunchProfileCommand): Promise<CreateLaunchProfileCommandReturnType> {
    const profile = encodeCatalogDefinition(data.profile, 'profile');
    const revisionId = await this.revisions.getDraftRevisionId();
    const created = await this.engine.createRow({
      revisionId,
      tableId: CatalogTable.launchProfiles,
      rowId: data.id,
      data: {
        pipelineId: data.pipelineId,
        status: data.status,
        profile,
      },
    });

    return toCatalogRecord(
      created.row,
      revisionId,
      false,
      decodeLaunchProfileRecordData(created.row.data),
    );
  }
}
