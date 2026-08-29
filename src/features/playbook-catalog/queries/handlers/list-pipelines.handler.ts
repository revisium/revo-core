import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { decodePipelineRecordData } from '../../engine/catalog-record.codec.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListPipelinesQuery): Promise<ListPipelinesQueryReturnType> {
    const { revisionId, isHead } = await this.revisions.resolveRevision(data);
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
        node: toCatalogRecord(
          edge.node,
          revisionId,
          isHead,
          decodePipelineRecordData(edge.node.data),
        ),
      })),
    };
  }
}
