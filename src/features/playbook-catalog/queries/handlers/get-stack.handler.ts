import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
import { GetStackQuery, type GetStackQueryReturnType } from '../impl/get-stack.query.js';

@QueryHandler(GetStackQuery)
export class GetStackHandler implements IQueryHandler<GetStackQuery, GetStackQueryReturnType> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetStackQuery): Promise<GetStackQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
    const row = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.stacks,
      rowId: data.id,
    });

    if (row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(row, revisionId, isHead);
  }
}
