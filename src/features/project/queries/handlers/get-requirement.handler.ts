import { QueryBus, QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { requireUserProject } from '../../project-request.js';
import { requirementFromRow, REQUIREMENT_TABLE_ID } from '../../requirement.js';
import {
  GetRequirementQuery,
  type GetRequirementQueryReturnType,
} from '../impl/get-requirement.query.js';

@QueryHandler(GetRequirementQuery)
export class GetRequirementHandler implements IQueryHandler<
  GetRequirementQuery,
  GetRequirementQueryReturnType
> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetRequirementQuery): Promise<GetRequirementQueryReturnType> {
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const row = await this.engine.getRow({
      revisionId,
      tableId: REQUIREMENT_TABLE_ID,
      rowId: data.id,
    });
    if (row === null) {
      return null;
    }

    return requirementFromRow(row);
  }
}
