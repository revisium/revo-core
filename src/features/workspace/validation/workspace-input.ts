import path from 'node:path';

import { WorkspaceType } from '../contracts/workspace.contracts.js';
import { WorkspaceError } from '../contracts/workspace.errors.js';

export function workspaceName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) {
    throw new WorkspaceError('WORKSPACE_INVALID_INPUT', 'name');
  }

  return value.trim();
}

export function workspaceDescription(value: unknown = ''): string {
  if (typeof value !== 'string') {
    throw new WorkspaceError('WORKSPACE_INVALID_INPUT', 'description');
  }

  return value;
}

export function workspaceType(value: unknown): WorkspaceType {
  if (value !== WorkspaceType.folder && value !== WorkspaceType.repository) {
    throw new WorkspaceError('WORKSPACE_INVALID_INPUT', 'type');
  }

  return value;
}

export function workspacePath(value: unknown): string {
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.includes('\0')) {
    throw new WorkspaceError('WORKSPACE_INVALID_INPUT', 'sourcePath');
  }

  return path.resolve(value);
}

export function workspaceIncludeArchived(value: unknown): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new WorkspaceError('WORKSPACE_INVALID_INPUT', 'includeArchived');
  }

  return value;
}
