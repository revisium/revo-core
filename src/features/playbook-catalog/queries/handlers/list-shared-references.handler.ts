import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  ListSharedReferencesQuery,
  type ListSharedReferencesQueryReturnType,
} from '../impl/list-shared-references.query.js';

@QueryHandler(ListSharedReferencesQuery)
export class ListSharedReferencesHandler implements IQueryHandler<
  ListSharedReferencesQuery,
  ListSharedReferencesQueryReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListSharedReferencesQuery): Promise<ListSharedReferencesQueryReturnType> {
    const { revisionId, isHead } = await this.revisions.resolveRevision(data);
    const page = await this.engine.getRows({
      revisionId,
      tableId: CatalogTable.sharedReferences,
      first: data.first,
      ...(data.after === undefined ? {} : { after: data.after }),
      ...(data.playbookId === undefined
        ? {}
        : { where: { data: { path: ['playbookId'], equals: data.playbookId } } }),
    });

    return {
      ...page,
      edges: page.edges.map((edge) => ({
        cursor: edge.cursor,
        node: toCatalogRecord(edge.node, revisionId, isHead),
      })),
    };
  }
}
