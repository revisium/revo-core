import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { RevoRunService } from '../../revo-run.service.js';
import { GetRunQuery, type GetRunQueryReturnType } from '../impl/get-run.query.js';

@QueryHandler(GetRunQuery)
export class GetRunHandler implements IQueryHandler<GetRunQuery, GetRunQueryReturnType> {
  constructor(private readonly runs: RevoRunService) {}

  execute(query: GetRunQuery): Promise<GetRunQueryReturnType> {
    return this.runs.getRun(query.data.runId);
  }
}
