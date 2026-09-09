import { Logger } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { reportErrorDiagnostic } from '../../../../infrastructure/error-diagnostic.js';
import { RevoRunService } from '../../revo-run.service.js';
import { isReportableRunError, rethrowPublicRunError } from '../../run-manager-error.mapper.js';
import {
  GetRunDetailsQuery,
  type GetRunDetailsQueryReturnType,
} from '../impl/get-run-details.query.js';

@QueryHandler(GetRunDetailsQuery)
export class GetRunDetailsHandler implements IQueryHandler<
  GetRunDetailsQuery,
  GetRunDetailsQueryReturnType
> {
  private readonly logger = new Logger(GetRunDetailsHandler.name);

  constructor(private readonly runs: RevoRunService) {}

  async execute(query: GetRunDetailsQuery): Promise<GetRunDetailsQueryReturnType> {
    try {
      return await this.runs.getRunDetails(query.data.runId);
    } catch (error) {
      if (isReportableRunError(error)) {
        reportErrorDiagnostic(
          this.logger,
          { operation: 'run.details.get', runId: query.data.runId },
          error,
        );
      }

      return rethrowPublicRunError(error);
    }
  }
}
