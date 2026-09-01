import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { RevoRunService } from '../../revo-run.service.js';
import { rethrowPublicRunError } from '../../run-manager-error.mapper.js';
import {
  GetRunDetailsQuery,
  type GetRunDetailsQueryReturnType,
} from '../impl/get-run-details.query.js';

@QueryHandler(GetRunDetailsQuery)
export class GetRunDetailsHandler implements IQueryHandler<
  GetRunDetailsQuery,
  GetRunDetailsQueryReturnType
> {
  constructor(private readonly runs: RevoRunService) {}

  async execute(query: GetRunDetailsQuery): Promise<GetRunDetailsQueryReturnType> {
    try {
      return await this.runs.getRunDetails(query.data.runId);
    } catch (error) {
      return rethrowPublicRunError(error);
    }
  }
}
