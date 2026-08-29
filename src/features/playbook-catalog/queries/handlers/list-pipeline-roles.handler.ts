import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
import {
  ListPipelineRolesQuery,
  type ListPipelineRolesQueryReturnType,
} from '../impl/list-pipeline-roles.query.js';

@QueryHandler(ListPipelineRolesQuery)
export class ListPipelineRolesHandler implements IQueryHandler<
  ListPipelineRolesQuery,
  ListPipelineRolesQueryReturnType
> {
  constructor(
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListPipelineRolesQuery): Promise<ListPipelineRolesQueryReturnType> {
    const { revisionId, isHead } = await this.revisions.resolveRevision(data);
    const page = await this.engine.getRows({
      revisionId,
      tableId: CatalogTable.pipelineRoles,
      first: data.first,
      ...(data.after === undefined ? {} : { after: data.after }),
      ...(data.pipelineId === undefined
        ? {}
        : { where: { data: { path: ['pipelineId'], equals: data.pipelineId } } }),
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
