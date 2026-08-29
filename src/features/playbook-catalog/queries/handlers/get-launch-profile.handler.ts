import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetLaunchProfileQuery): Promise<GetLaunchProfileQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
    const row = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.launchProfiles,
      rowId: data.id,
    });

    if (row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(row, revisionId, isHead);
  }
}
