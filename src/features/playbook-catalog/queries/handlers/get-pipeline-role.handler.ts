import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogError, CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetPipelineRoleQuery): Promise<GetPipelineRoleQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
    const row = await this.engine.getRow({
      revisionId,
      tableId: CatalogTable.pipelineRoles,
      rowId: data.id,
    });

    if (row === null) {
      throw new NotFoundException(CatalogError.recordUnavailable);
    }

    return this.drafts.toRecord(row, revisionId, isHead, CatalogTable.pipelineRoles);
  }
}
