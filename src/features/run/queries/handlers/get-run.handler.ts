import { Logger } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { reportErrorDiagnostic } from '../../../../infrastructure/error-diagnostic.js';
import { RevoRunService } from '../../../../infrastructure/run-runtime/revo-run.service.js';
import { ProjectApiService } from '../../../project/project-api.service.js';
import { isReportableRunError, rethrowPublicRunError } from '../../run-manager-error.mapper.js';
import { GetRunQuery, type GetRunQueryReturnType } from '../impl/get-run.query.js';

@QueryHandler(GetRunQuery)
export class GetRunHandler implements IQueryHandler<GetRunQuery, GetRunQueryReturnType> {
  private readonly logger = new Logger(GetRunHandler.name);

  constructor(
    private readonly runs: RevoRunService,
    private readonly projects: ProjectApiService,
  ) {}

  async execute(query: GetRunQuery): Promise<GetRunQueryReturnType> {
    try {
      const run = await this.runs.getRun(query.data.runId);

      if (run === undefined) {
        return undefined;
      }

      return { ...run, projectId: await this.projects.getRunProjectId(query.data) };
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
