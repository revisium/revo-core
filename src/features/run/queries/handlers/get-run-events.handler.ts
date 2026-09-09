import { Logger } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { reportErrorDiagnostic } from '../../../../infrastructure/error-diagnostic.js';
import { RevoRunService } from '../../revo-run.service.js';
import { isReportableRunError, rethrowPublicRunError } from '../../run-manager-error.mapper.js';
import {
  GetRunEventsQuery,
  type GetRunEventsQueryReturnType,
} from '../impl/get-run-events.query.js';

@QueryHandler(GetRunEventsQuery)
export class GetRunEventsHandler implements IQueryHandler<
  GetRunEventsQuery,
  GetRunEventsQueryReturnType
> {
  private readonly logger = new Logger(GetRunEventsHandler.name);

  constructor(private readonly runs: RevoRunService) {}

  async execute(query: GetRunEventsQuery): Promise<GetRunEventsQueryReturnType> {
    try {
      return await this.runs.getRunEvents(query.data.runId, query.data.page);
    } catch (error) {
      if (isReportableRunError(error)) {
        reportErrorDiagnostic(
          this.logger,
          { operation: 'run.events.get', runId: query.data.runId },
          error,
        );
      }

      return rethrowPublicRunError(error);
    }
  }
}
