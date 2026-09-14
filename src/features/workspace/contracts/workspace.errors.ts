import { HttpException } from '@nestjs/common';

const errors = {
  WORKSPACE_NOT_FOUND: [404, 'Workspace was not found in this Project.'],
  WORKSPACE_PROJECT_NOT_FOUND: [404, 'Project was not found.'],
  WORKSPACE_PROJECT_ARCHIVED: [409, 'Workspace changes require an active Project.'],
  WORKSPACE_ARCHIVED: [409, 'Workspace is archived.'],
  WORKSPACE_INVALID_INPUT: [400, 'Workspace input is invalid.'],
} as const;

export type WorkspaceInputField =
  | 'name'
  | 'description'
  | 'type'
  | 'sourcePath'
  | 'includeArchived';

export class WorkspaceError extends HttpException {
  constructor(
    readonly code: keyof typeof errors,
    readonly field?: WorkspaceInputField,
  ) {
    const [statusCode, message] = errors[code];
    super({ code, statusCode, message, ...(field === undefined ? {} : { field }) }, statusCode);
  }
}
