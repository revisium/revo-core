import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogError } from '../../contracts/catalog.errors.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import { GetPlaybookQuery, type GetPlaybookQueryReturnType } from '../impl/get-playbook.query.js';

@QueryHandler(GetPlaybookQuery)
export class GetPlaybookHandler implements IQueryHandler<
  GetPlaybookQuery,
  GetPlaybookQueryReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetPlaybookQuery): Promise<GetPlaybookQueryReturnType> {
    const { revisionId, isHead } = await this.revisions.resolveRevision(data);
    const row = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.playbooks,
      rowId: data.id,
    });

    if (row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return toCatalogRecord(row, revisionId, isHead);
  }
}
