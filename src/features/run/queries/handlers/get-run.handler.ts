import { Logger } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { RunSnapshot } from '@revisium/revo-run';

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
    let run: RunSnapshot | undefined;

    try {
      run = await this.runs.getRun(query.data.runId);
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

    if (run === undefined) {
      return undefined;
    }

    const projectId = await this.projects.getRunProjectId(query.data);

    return { ...run, projectId };
  }
}
