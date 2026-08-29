import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { RevoRunService } from '../../revo-run.service.js';
import { rethrowPublicRunError } from '../../run-manager-error.mapper.js';
import { GetRunQuery, type GetRunQueryReturnType } from '../impl/get-run.query.js';

@QueryHandler(GetRunQuery)
export class GetRunHandler implements IQueryHandler<GetRunQuery, GetRunQueryReturnType> {
  constructor(private readonly runs: RevoRunService) {}

  async execute(query: GetRunQuery): Promise<GetRunQueryReturnType> {
    try {
      return await this.runs.getRun(query.data.runId);
    } catch (error) {
      return rethrowPublicRunError(error);
    }
  }
}
