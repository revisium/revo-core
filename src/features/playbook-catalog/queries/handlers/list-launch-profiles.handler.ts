import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogDraftService } from '../../catalog-draft.service.js';
import { CatalogTable } from '../../constants/catalog.constants.js';
import {
  ListLaunchProfilesQuery,
  type ListLaunchProfilesQueryReturnType,
} from '../impl/list-launch-profiles.query.js';

@QueryHandler(ListLaunchProfilesQuery)
export class ListLaunchProfilesHandler implements IQueryHandler<
  ListLaunchProfilesQuery,
  ListLaunchProfilesQueryReturnType
> {
  constructor(
    private readonly drafts: CatalogDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListLaunchProfilesQuery): Promise<ListLaunchProfilesQueryReturnType> {
    const { revisionId, isHead } = await this.drafts.resolveRevision(data);
    const page = await this.engine.getRows({
      revisionId,
      tableId: CatalogTable.launchProfiles,
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
        node: this.drafts.toRecord(edge.node, revisionId, isHead, CatalogTable.launchProfiles),
      })),
    };
  }
}
