import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogError } from '../../contracts/catalog.errors.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import { GetStackQuery, type GetStackQueryReturnType } from '../impl/get-stack.query.js';

@QueryHandler(GetStackQuery)
export class GetStackHandler implements IQueryHandler<GetStackQuery, GetStackQueryReturnType> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetStackQuery): Promise<GetStackQueryReturnType> {
    const { revisionId, isHead } = await this.revisions.resolveRevision(data);
    const row = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.stacks,
      rowId: data.id,
    });

    if (row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return toCatalogRecord(row, revisionId, isHead);
  }
}
