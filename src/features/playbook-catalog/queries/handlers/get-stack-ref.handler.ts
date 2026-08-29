import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
import { GetStackRefQuery, type GetStackRefQueryReturnType } from '../impl/get-stack-ref.query.js';

@QueryHandler(GetStackRefQuery)
export class GetStackRefHandler implements IQueryHandler<
  GetStackRefQuery,
  GetStackRefQueryReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetStackRefQuery): Promise<GetStackRefQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
    const row = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.stackRefs,
      rowId: data.id,
    });

    if (row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(row, revisionId, isHead);
  }
}
