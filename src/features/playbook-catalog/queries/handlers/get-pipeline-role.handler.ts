import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { CatalogError } from '../../contracts/catalog.errors.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  GetPipelineRoleQuery,
  type GetPipelineRoleQueryReturnType,
} from '../impl/get-pipeline-role.query.js';

@QueryHandler(GetPipelineRoleQuery)
export class GetPipelineRoleHandler implements IQueryHandler<
  GetPipelineRoleQuery,
  GetPipelineRoleQueryReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetPipelineRoleQuery): Promise<GetPipelineRoleQueryReturnType> {
    const { revisionId, isHead } = await this.revisions.resolveRevision(data);
    const row = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.pipelineRoles,
      rowId: data.id,
    });

    if (row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return toCatalogRecord(row, revisionId, isHead);
  }
}
