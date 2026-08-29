import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListStackRefsQuery): Promise<ListStackRefsQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
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
        node: this.drafts.toRecord(edge.node, revisionId, isHead),
      })),
    };
  }
}
