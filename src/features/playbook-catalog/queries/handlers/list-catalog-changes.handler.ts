import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { toCatalogChanges } from '../../engine/catalog-change.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  ListCatalogChangesQuery,
  type ListCatalogChangesQueryReturnType,
} from '../impl/list-catalog-changes.query.js';

@QueryHandler(ListCatalogChangesQuery)
export class ListCatalogChangesHandler implements IQueryHandler<
  ListCatalogChangesQuery,
  ListCatalogChangesQueryReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListCatalogChangesQuery): Promise<ListCatalogChangesQueryReturnType> {
    const revisionId = await this.revisions.getDraftRevisionId();
    const page = await this.engine.rowChanges({
      revisionId,
      first: data.first,
      ...(data.after === undefined ? {} : { after: data.after }),
      filters: { includeSystem: false },
    });

    return toCatalogChanges(page);
  }
}
