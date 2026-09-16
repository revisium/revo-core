import { PublicHttpException } from '../../../infrastructure/errors/public-http-exception.js';
import { ProjectError } from './errors.en.js';

export { ProjectError } from './errors.en.js';

export class ProjectHasActiveRunsError extends PublicHttpException {
  constructor(runIds: readonly string[]) {
    super(
      {
        statusCode: 409,
        code: 'project_has_active_runs',
        message: ProjectError.hasActiveRuns,
        path: '/projectId',
        details: { runIds: [...runIds] },
      },
      'response',
    );
  }
}
