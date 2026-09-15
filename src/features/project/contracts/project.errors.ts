import { ApplicationError } from '../../../application/errors/application-error.js';

export const ProjectErrorCode = {
  notFound: 'PROJECT_NOT_FOUND',
  notActive: 'PROJECT_NOT_ACTIVE',
  notArchived: 'PROJECT_NOT_ARCHIVED',
  nameRequired: 'PROJECT_NAME_REQUIRED',
  descriptionInvalid: 'PROJECT_DESCRIPTION_INVALID',
  recordNotFound: 'PROJECT_RECORD_NOT_FOUND',
  hasActiveRuns: 'PROJECT_HAS_ACTIVE_RUNS',
} as const;

export type ProjectErrorCode = (typeof ProjectErrorCode)[keyof typeof ProjectErrorCode];

export type ProjectErrorDetails = {
  PROJECT_NOT_FOUND: Record<string, never>;
  PROJECT_NOT_ACTIVE: Record<string, never>;
  PROJECT_NOT_ARCHIVED: Record<string, never>;
  PROJECT_NAME_REQUIRED: Record<string, never>;
  PROJECT_DESCRIPTION_INVALID: Record<string, never>;
  PROJECT_RECORD_NOT_FOUND: Record<string, never>;
  PROJECT_HAS_ACTIVE_RUNS: { readonly runIds: readonly string[] };
};

export const ProjectTechnicalError = {
  initCommitMissing: 'Project creation did not publish the initial revision.',
} as const;

export class ProjectApplicationError<
  TCode extends ProjectErrorCode = ProjectErrorCode,
> extends ApplicationError<TCode, ProjectErrorDetails[ProjectErrorCode]> {
  constructor(
    code: TCode,
    ...details: ProjectErrorDetails[TCode] extends Record<string, never>
      ? [details?: ProjectErrorDetails[TCode]]
      : [details: ProjectErrorDetails[TCode]]
  ) {
    super(code, details[0] ?? {});
  }
}
