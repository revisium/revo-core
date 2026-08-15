import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CATALOG_BRANCH_NAME, CATALOG_PROJECT_ID } from '../../constants/catalog.constants.js';
import {
  GetCatalogStatusQuery,
  type GetCatalogStatusQueryReturnType,
} from '../impl/get-catalog-status.query.js';

@QueryHandler(GetCatalogStatusQuery)
export class GetCatalogStatusHandler implements IQueryHandler<
  GetCatalogStatusQuery,
  GetCatalogStatusQueryReturnType
> {
  constructor(private readonly engine: EngineApiService) {}

  async execute(): Promise<GetCatalogStatusQueryReturnType> {
    const branch = await this.engine.getBranch({
      projectId: CATALOG_PROJECT_ID,
      branchName: CATALOG_BRANCH_NAME,
    });
    const head = await this.engine.getHeadRevision(branch.id);
    const draft = await this.engine.getDraftRevision(branch.id);
    const changes = await this.engine.rowChanges({
      revisionId: draft.id,
      first: 1,
      filters: { includeSystem: false },
    });

    return {
      headRevisionId: head.id,
      draftRevisionId: draft.id,
      hasChanges: changes.totalCount > 0,
      totalChanges: changes.totalCount,
    };
  }
}
