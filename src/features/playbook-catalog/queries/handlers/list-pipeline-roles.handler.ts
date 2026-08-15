import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
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
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListPipelineRolesQuery): Promise<ListPipelineRolesQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
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
        node: this.drafts.toRecord(edge.node, revisionId, isHead, CatalogTable.pipelineRoles),
      })),
    };
  }
}
