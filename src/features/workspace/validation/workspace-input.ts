import path from 'node:path';

import { WorkspaceType } from '../contracts/workspace.contracts.js';
import { WorkspaceError } from '../contracts/workspace.errors.js';

export function workspaceName(value: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) {
    throw new WorkspaceError('WORKSPACE_INVALID_INPUT');
  }

  return value.trim();
}

export function workspaceDescription(value: string): string {
  if (typeof value !== 'string') {
    throw new WorkspaceError('WORKSPACE_INVALID_INPUT');
  }

  return value;
}

export function workspaceType(value: WorkspaceType): WorkspaceType {
  if (value !== WorkspaceType.folder && value !== WorkspaceType.repository) {
    throw new WorkspaceError('WORKSPACE_INVALID_INPUT');
  }

  return value;
}

export function workspacePath(value: string): string {
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.includes('\0')) {
    throw new WorkspaceError('WORKSPACE_INVALID_INPUT');
  }

  return path.resolve(value);
}
