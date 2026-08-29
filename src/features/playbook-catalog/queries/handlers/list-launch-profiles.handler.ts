import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { CatalogTable } from '../../contracts/catalog-table.js';
import { decodeLaunchProfileRecordData } from '../../engine/catalog-record.codec.js';
import { toCatalogRecord } from '../../engine/catalog-record.mapper.js';
import { CatalogRevisionService } from '../../engine/catalog-revision.service.js';
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
    private readonly revisions: CatalogRevisionService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: ListLaunchProfilesQuery): Promise<ListLaunchProfilesQueryReturnType> {
    const { revisionId, isHead } = await this.revisions.resolveRevision(data);
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
        node: toCatalogRecord(
          edge.node,
          revisionId,
          isHead,
          decodeLaunchProfileRecordData(edge.node.data),
        ),
      })),
    };
  }
}
