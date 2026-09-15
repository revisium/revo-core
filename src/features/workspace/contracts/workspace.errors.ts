import { ApplicationError } from '../../../application/errors/application-error.js';

export const WorkspaceErrorCode = {
  notFound: 'WORKSPACE_NOT_FOUND',
  projectNotFound: 'WORKSPACE_PROJECT_NOT_FOUND',
  projectArchived: 'WORKSPACE_PROJECT_ARCHIVED',
  archived: 'WORKSPACE_ARCHIVED',
  invalidInput: 'WORKSPACE_INVALID_INPUT',
} as const;

export type WorkspaceErrorCode = (typeof WorkspaceErrorCode)[keyof typeof WorkspaceErrorCode];

export type WorkspaceErrorDetails = {
  WORKSPACE_NOT_FOUND: Record<string, never>;
  WORKSPACE_PROJECT_NOT_FOUND: Record<string, never>;
  WORKSPACE_PROJECT_ARCHIVED: Record<string, never>;
  WORKSPACE_ARCHIVED: Record<string, never>;
  WORKSPACE_INVALID_INPUT: { readonly field?: WorkspaceInputField };
};

export type WorkspaceInputField =
  | 'name'
  | 'description'
  | 'type'
  | 'sourcePath'
  | 'includeArchived';

export type WorkspaceFailure = {
  [TCode in WorkspaceErrorCode]: Readonly<{ code: TCode; details: WorkspaceErrorDetails[TCode] }>;
}[WorkspaceErrorCode];

export class WorkspaceError extends ApplicationError<WorkspaceFailure> {}
