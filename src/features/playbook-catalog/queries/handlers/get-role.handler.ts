import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
import { GetRoleQuery, type GetRoleQueryReturnType } from '../impl/get-role.query.js';

@QueryHandler(GetRoleQuery)
export class GetRoleHandler implements IQueryHandler<GetRoleQuery, GetRoleQueryReturnType> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetRoleQuery): Promise<GetRoleQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
    const row = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.roles,
      rowId: data.id,
    });

    if (row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(row, revisionId, isHead);
  }
}
