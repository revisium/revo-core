import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListSharedReferencesQuery): Promise<ListSharedReferencesQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
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
        node: this.drafts.toRecord(edge.node, revisionId, isHead),
      })),
    };
  }
}
