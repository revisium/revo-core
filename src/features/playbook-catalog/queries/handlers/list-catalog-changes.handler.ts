import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { toCatalogChanges } from '../../domain/catalog-change.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListCatalogChangesQuery): Promise<ListCatalogChangesQueryReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId();
    const page = await this.engine.rowChanges({
      revisionId,
      first: data.first,
      ...(data.after === undefined ? {} : { after: data.after }),
      filters: { includeSystem: false },
    });

    return toCatalogChanges(page);
  }
}
