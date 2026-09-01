import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { RevoRunService } from '../../revo-run.service.js';
import { rethrowPublicRunError } from '../../run-manager-error.mapper.js';
import {
  GetRunEventsQuery,
  type GetRunEventsQueryReturnType,
} from '../impl/get-run-events.query.js';

@QueryHandler(GetRunEventsQuery)
export class GetRunEventsHandler implements IQueryHandler<
  GetRunEventsQuery,
  GetRunEventsQueryReturnType
> {
  constructor(private readonly runs: RevoRunService) {}

  async execute(query: GetRunEventsQuery): Promise<GetRunEventsQueryReturnType> {
    try {
      return await this.runs.getRunEvents(query.data.runId, query.data.page);
    } catch (error) {
      return rethrowPublicRunError(error);
    }
  }
}
