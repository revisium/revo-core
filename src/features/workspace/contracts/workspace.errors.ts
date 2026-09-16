import { PublicHttpException } from '../../../infrastructure/errors/public-http-exception.js';
import { WorkspaceErrorText } from './errors.en.js';

const statuses = {
  WORKSPACE_NOT_FOUND: 404,
  WORKSPACE_PROJECT_NOT_FOUND: 404,
  WORKSPACE_PROJECT_ARCHIVED: 409,
  WORKSPACE_ARCHIVED: 409,
  WORKSPACE_INVALID_INPUT: 400,
} as const;

export type WorkspaceInputField =
  | 'name'
  | 'description'
  | 'type'
  | 'sourcePath'
  | 'includeArchived';

export class WorkspaceError extends PublicHttpException {
  constructor(
    readonly code: keyof typeof statuses,
    readonly field?: WorkspaceInputField,
  ) {
    const statusCode = statuses[code];
    const message = WorkspaceErrorText[code];
    super({ code, statusCode, message, ...(field === undefined ? {} : { field }) }, 'minimal');
  }
}
