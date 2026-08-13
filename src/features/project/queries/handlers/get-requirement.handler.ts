import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectTable } from '../../constants/project.constants.js';
import { ProjectDraftService } from '../../project-draft.service.js';
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
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetRequirementQuery): Promise<GetRequirementQueryReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const row = await this.engine.getRow({
      revisionId,
      tableId: ProjectTable.requirement,
      rowId: data.id,
    });
    if (row === null) {
      return null;
    }

    return this.drafts.toRecord(row);
  }
}
