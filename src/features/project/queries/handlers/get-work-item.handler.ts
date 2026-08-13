import { QueryBus, QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { requireUserProject } from '../../project-request.js';
import { workItemFromRow, WORK_ITEM_TABLE_ID } from '../../work-item.js';
import { GetWorkItemQuery, type GetWorkItemQueryReturnType } from '../impl/get-work-item.query.js';

@QueryHandler(GetWorkItemQuery)
export class GetWorkItemHandler implements IQueryHandler<
  GetWorkItemQuery,
  GetWorkItemQueryReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetWorkItemQuery): Promise<GetWorkItemQueryReturnType> {
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const row = await this.engine.getRow({
      revisionId,
      tableId: WORK_ITEM_TABLE_ID,
      rowId: data.id,
    });
    if (row === null) {
      return null;
    }

    return workItemFromRow(row);
  }
}
