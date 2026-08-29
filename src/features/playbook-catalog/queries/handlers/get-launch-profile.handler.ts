import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogError } from '../../contracts/catalog.errors.js';
import { decodeLaunchProfileRecordData } from '../../engine/catalog-record.codec.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  GetLaunchProfileQuery,
  type GetLaunchProfileQueryReturnType,
} from '../impl/get-launch-profile.query.js';

@QueryHandler(GetLaunchProfileQuery)
export class GetLaunchProfileHandler implements IQueryHandler<
  GetLaunchProfileQuery,
  GetLaunchProfileQueryReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetLaunchProfileQuery): Promise<GetLaunchProfileQueryReturnType> {
    const { revisionId, isHead } = await this.revisions.resolveRevision(data);
    const row = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.launchProfiles,
      rowId: data.id,
    });

    if (row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return toCatalogRecord(row, revisionId, isHead, decodeLaunchProfileRecordData(row.data));
  }
}
