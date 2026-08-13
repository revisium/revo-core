import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import { GetAdrQuery, type GetAdrQueryReturnType } from '../impl/get-adr.query.js';

@QueryHandler(GetAdrQuery)
export class GetAdrHandler implements IQueryHandler<GetAdrQuery, GetAdrQueryReturnType> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetAdrQuery): Promise<GetAdrQueryReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const row = await this.engine.getRow({
      revisionId,
      tableId: 'ADR',
      rowId: data.id,
    });
    if (row === null) {
      return null;
    }

    return this.drafts.toRecord(row);
  }
}
