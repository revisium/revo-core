import { ApplicationError } from '../../../application/errors/application-error.js';

export const ProjectErrorCode = {
  notFound: 'PROJECT_NOT_FOUND',
  notActive: 'PROJECT_NOT_ACTIVE',
  notArchived: 'PROJECT_NOT_ARCHIVED',
  nameRequired: 'PROJECT_NAME_REQUIRED',
  descriptionInvalid: 'PROJECT_DESCRIPTION_INVALID',
  recordNotFound: 'PROJECT_RECORD_NOT_FOUND',
  hasActiveRuns: 'project_has_active_runs',
} as const;

export type ProjectErrorCode = (typeof ProjectErrorCode)[keyof typeof ProjectErrorCode];

export type ProjectErrorDetails = {
  PROJECT_NOT_FOUND: Record<string, never>;
  PROJECT_NOT_ACTIVE: Record<string, never>;
  PROJECT_NOT_ARCHIVED: Record<string, never>;
  PROJECT_NAME_REQUIRED: Record<string, never>;
  PROJECT_DESCRIPTION_INVALID: Record<string, never>;
  PROJECT_RECORD_NOT_FOUND: Record<string, never>;
  project_has_active_runs: { readonly runIds: readonly string[] };
};

export const ProjectTechnicalError = {
  initCommitMissing: 'Project creation did not publish the initial revision.',
} as const;

export type ProjectFailure = {
  [TCode in ProjectErrorCode]: Readonly<{ code: TCode; details: ProjectErrorDetails[TCode] }>;
}[ProjectErrorCode];

export class ProjectApplicationError extends ApplicationError<ProjectFailure> {}
