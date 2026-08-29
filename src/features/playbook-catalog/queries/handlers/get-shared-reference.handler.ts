import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
import {
  GetSharedReferenceQuery,
  type GetSharedReferenceQueryReturnType,
} from '../impl/get-shared-reference.query.js';

@QueryHandler(GetSharedReferenceQuery)
export class GetSharedReferenceHandler implements IQueryHandler<
  GetSharedReferenceQuery,
  GetSharedReferenceQueryReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetSharedReferenceQuery): Promise<GetSharedReferenceQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
    const row = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.sharedReferences,
      rowId: data.id,
    });

    if (row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(row, revisionId, isHead);
  }
}
