import { Logger } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { reportErrorDiagnostic } from '../../../../infrastructure/error-diagnostic.js';
import { RevoRunService } from '../../revo-run.service.js';
import { isReportableRunError, rethrowPublicRunError } from '../../run-manager-error.mapper.js';
import { GetRunQuery, type GetRunQueryReturnType } from '../impl/get-run.query.js';

@QueryHandler(GetRunQuery)
export class GetRunHandler implements IQueryHandler<GetRunQuery, GetRunQueryReturnType> {
  private readonly logger = new Logger(GetRunHandler.name);

  constructor(private readonly runs: RevoRunService) {}

  async execute(query: GetRunQuery): Promise<GetRunQueryReturnType> {
    try {
      return await this.runs.getRun(query.data.runId);
    } catch (error) {
      if (isReportableRunError(error)) {
        reportErrorDiagnostic(
          this.logger,
          { operation: 'run.get', runId: query.data.runId },
          error,
        );
      }

      return rethrowPublicRunError(error);
    }
  }
}
