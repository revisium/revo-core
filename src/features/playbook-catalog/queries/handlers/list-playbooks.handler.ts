import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListPlaybooksQuery): Promise<ListPlaybooksQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
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
        node: this.drafts.toRecord(edge.node, revisionId, isHead),
      })),
    };
  }
}
