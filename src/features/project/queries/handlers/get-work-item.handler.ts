import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { GetWorkItemQuery, type GetWorkItemQueryReturnType } from '../impl/get-work-item.query.js';

@QueryHandler(GetWorkItemQuery)
export class GetWorkItemHandler implements IQueryHandler<
  GetWorkItemQuery,
  GetWorkItemQueryReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetWorkItemQuery): Promise<GetWorkItemQueryReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const row = await this.engine.getRow({
      revisionId,
      tableId: 'WorkItem',
      rowId: data.id,
    });
    if (row === null) {
      return null;
    }

    return this.drafts.toRecord(row);
  }
}
