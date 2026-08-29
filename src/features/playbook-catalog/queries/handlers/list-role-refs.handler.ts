import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListRoleRefsQuery): Promise<ListRoleRefsQueryReturnType> {
    const { revisionId, isHead } = await this.revisions.resolveRevision(data);
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
        node: toCatalogRecord(edge.node, revisionId, isHead),
      })),
    };
  }
}
