import { HttpException } from '@nestjs/common';

const errors = {
  WORKSPACE_NOT_FOUND: [404, 'Workspace was not found in this Project.'],
  WORKSPACE_PROJECT_NOT_FOUND: [404, 'Project was not found.'],
  WORKSPACE_PROJECT_ARCHIVED: [409, 'Workspace changes require an active Project.'],
  WORKSPACE_CONFLICT: [409, 'Workspace is disconnected.'],
  WORKSPACE_INVALID_INPUT: [400, 'Workspace input is invalid.'],
  WORKSPACE_ACTOR_REQUIRED: [403, 'A trusted Actor is required for Workspace changes.'],
} as const;

export class WorkspaceError extends HttpException {
  constructor(readonly code: keyof typeof errors) {
    const [statusCode, message] = errors[code];
    super({ code, statusCode, message }, statusCode);
  }
}
