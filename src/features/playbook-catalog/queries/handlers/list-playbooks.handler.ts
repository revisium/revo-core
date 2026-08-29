import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  ListPlaybooksQuery,
  type ListPlaybooksQueryReturnType,
} from '../impl/list-playbooks.query.js';

@QueryHandler(ListPlaybooksQuery)
export class ListPlaybooksHandler implements IQueryHandler<
  ListPlaybooksQuery,
  ListPlaybooksQueryReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListPlaybooksQuery): Promise<ListPlaybooksQueryReturnType> {
    const { revisionId, isHead } = await this.revisions.resolveRevision(data);
    const page = await this.engine.getRows({
      revisionId,
      tableId: CatalogTable.playbooks,
      first: data.first,
      ...(data.after === undefined ? {} : { after: data.after }),
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
