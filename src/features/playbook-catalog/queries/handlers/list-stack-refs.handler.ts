import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  ListStackRefsQuery,
  type ListStackRefsQueryReturnType,
} from '../impl/list-stack-refs.query.js';

@QueryHandler(ListStackRefsQuery)
export class ListStackRefsHandler implements IQueryHandler<
  ListStackRefsQuery,
  ListStackRefsQueryReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListStackRefsQuery): Promise<ListStackRefsQueryReturnType> {
    const { revisionId, isHead } = await this.revisions.resolveRevision(data);
    const page = await this.engine.getRows({
      revisionId,
      tableId: CatalogTable.stackRefs,
      first: data.first,
      ...(data.after === undefined ? {} : { after: data.after }),
      ...(data.stackId === undefined
        ? {}
        : { where: { data: { path: ['stackId'], equals: data.stackId } } }),
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
