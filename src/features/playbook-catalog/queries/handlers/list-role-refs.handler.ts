import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  ListRoleRefsQuery,
  type ListRoleRefsQueryReturnType,
} from '../impl/list-role-refs.query.js';

@QueryHandler(ListRoleRefsQuery)
export class ListRoleRefsHandler implements IQueryHandler<
  ListRoleRefsQuery,
  ListRoleRefsQueryReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListRoleRefsQuery): Promise<ListRoleRefsQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
    const page = await this.engine.getRows({
      revisionId,
      tableId: CatalogTable.roleRefs,
      first: data.first,
      ...(data.after === undefined ? {} : { after: data.after }),
      ...(data.roleId === undefined
        ? {}
        : { where: { data: { path: ['roleId'], equals: data.roleId } } }),
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
