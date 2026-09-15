import { Logger } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { RunDetails } from '@revisium/revo-run';

import { reportErrorDiagnostic } from '../../../../infrastructure/error-diagnostic.js';
import { RevoRunService } from '../../../../infrastructure/run-runtime/revo-run.service.js';
import { ProjectApiService } from '../../../project/project-api.service.js';
import {
  isReportableRunError,
  rethrowPublicRunError,
} from '../../engine/run-manager-error.mapper.js';
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

  constructor(
    private readonly runs: RevoRunService,
    private readonly projects: ProjectApiService,
  ) {}

  async execute(query: GetRunDetailsQuery): Promise<GetRunDetailsQueryReturnType> {
    let details: RunDetails | undefined;

    try {
      details = await this.runs.getRunDetails(query.data.runId);
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

    if (details === undefined) {
      return undefined;
    }

    const projectId = await this.projects.getRunProjectId(query.data);

    return { ...details, projectId };
  }
}
