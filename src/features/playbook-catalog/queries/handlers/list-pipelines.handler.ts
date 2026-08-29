import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  ListPipelinesQuery,
  type ListPipelinesQueryReturnType,
} from '../impl/list-pipelines.query.js';

@QueryHandler(ListPipelinesQuery)
export class ListPipelinesHandler implements IQueryHandler<
  ListPipelinesQuery,
  ListPipelinesQueryReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListPipelinesQuery): Promise<ListPipelinesQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
    const page = await this.engine.getRows({
      revisionId,
      tableId: CatalogTable.pipelines,
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
        node: this.drafts.toRecord(edge.node, revisionId, isHead),
      })),
    };
  }
}
