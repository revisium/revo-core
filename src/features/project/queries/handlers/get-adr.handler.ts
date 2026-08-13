import { QueryBus, QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { adrFromRow, ADR_TABLE_ID } from '../../adr.js';
import { ProjectDraftService } from '../../project-draft.service.js';
import { requireUserProject } from '../../project-request.js';
import { GetAdrQuery, type GetAdrQueryReturnType } from '../impl/get-adr.query.js';

@QueryHandler(GetAdrQuery)
export class GetAdrHandler implements IQueryHandler<GetAdrQuery, GetAdrQueryReturnType> {
  constructor(
    private readonly queries: QueryBus,
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetAdrQuery): Promise<GetAdrQueryReturnType> {
    await requireUserProject(this.queries, data.projectId);
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const row = await this.engine.getRow({
      revisionId,
      tableId: ADR_TABLE_ID,
      rowId: data.id,
    });
    if (row === null) {
      return null;
    }

    return adrFromRow(row);
  }
}
