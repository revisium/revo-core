import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';

import { ProjectDraftService } from '../../project-draft.service.js';
import {
  GetProjectRecordQuery,
  type GetProjectRecordQueryReturnType,
} from '../impl/get-project-record.query.js';

@QueryHandler(GetProjectRecordQuery)
export class GetProjectRecordHandler implements IQueryHandler<
  GetProjectRecordQuery,
  GetProjectRecordQueryReturnType
> {
  constructor(
    private readonly drafts: ProjectDraftService,
    private readonly engine: EngineApiService,
  ) {}

  async execute({ data }: GetProjectRecordQuery): Promise<GetProjectRecordQueryReturnType> {
    const revisionId = await this.drafts.getDraftRevisionId(data.projectId);
    const row = await this.engine.getRow({
      revisionId,
      tableId: data.tableId,
      rowId: data.rowId,
    });
    if (row === null) {
      return null;
    }

    return { id: row.id, data: row.data };
  }
}
