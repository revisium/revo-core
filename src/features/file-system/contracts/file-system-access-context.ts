import path from 'node:path';

import {
  FileSystemPermission,
  type FileSystemAccessPolicy,
  type FileSystemScope,
  type FileSystemPermissionSet,
  type FileSystemPathRule,
} from './file-system.contracts.js';
import { FileSystemError } from './file-system.error.js';

export class FileSystemAccessContext {
  private constructor(readonly policies: readonly FileSystemAccessPolicy[]) {
    Object.freeze(this);
  }

  static create(grant: FileSystemAccessPolicy): FileSystemAccessContext {
    return new FileSystemAccessContext(Object.freeze([parseFileSystemAccessPolicy(grant)]));
  }

  restrict(boundary: FileSystemAccessPolicy): FileSystemAccessContext {
    return new FileSystemAccessContext(
      Object.freeze([...this.policies, parseFileSystemAccessPolicy(boundary)]),
    );
  }
}

export function parseFileSystemAccessPolicy(value: unknown): FileSystemAccessPolicy {
  if (!isRecord(value) || !Array.isArray(value.scopes)) {
    throw new FileSystemError('FILE_SYSTEM_INVALID_POLICY');
  }

  return Object.freeze({ scopes: Object.freeze(value.scopes.map(parseScope)) });
}

function parseScope(value: unknown): FileSystemScope {
  if (
    !isRecord(value) ||
    typeof value.rootPath !== 'string' ||
    !path.isAbsolute(value.rootPath) ||
    value.rootPath.includes('\0')
  ) {
    throw new FileSystemError('FILE_SYSTEM_INVALID_POLICY');
  }

  return Object.freeze({
    rootPath: path.resolve(value.rootPath),
    ...parseFileSystemPermissionSet({ allow: value.allow, deny: value.deny, rules: value.rules }),
  });
}

export function parseFileSystemPermissionSet(value: unknown): FileSystemPermissionSet {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !['allow', 'deny', 'rules'].includes(key))
  ) {
    throw new FileSystemError('FILE_SYSTEM_INVALID_POLICY');
  }

  const allow = permissions(value.allow);
  const deny = value.deny === undefined ? [] : permissions(value.deny);

  if (value.rules !== undefined && !Array.isArray(value.rules)) {
    throw new FileSystemError('FILE_SYSTEM_INVALID_POLICY');
  }

  const rules = value.rules === undefined ? [] : value.rules.map(parseRule);

  return Object.freeze({ allow, deny, rules: Object.freeze(rules) });
}

function parseRule(value: unknown): FileSystemPathRule {
  if (
    !isRecord(value) ||
    typeof value.path !== 'string' ||
    value.path.includes('\0') ||
    path.isAbsolute(value.path) ||
    path.win32.isAbsolute(value.path) ||
    /^[a-z]:/iu.test(value.path) ||
    value.path.split(/[/\\]/u).includes('..') ||
    (value.match !== 'EXACT' && value.match !== 'SUBTREE')
  ) {
    throw new FileSystemError('FILE_SYSTEM_INVALID_POLICY');
  }

  return Object.freeze({
    path: value.path,
    match: value.match,
    allow: value.allow === undefined ? [] : permissions(value.allow),
    deny: value.deny === undefined ? [] : permissions(value.deny),
  });
}

function permissions(value: unknown): readonly FileSystemPermission[] {
  if (!Array.isArray(value)) {
    throw new FileSystemError('FILE_SYSTEM_INVALID_POLICY');
  }

  const result: FileSystemPermission[] = [];

  for (const permission of value) {
    const known = Object.values(FileSystemPermission).find((candidate) => candidate === permission);

    if (known === undefined) {
      throw new FileSystemError('FILE_SYSTEM_INVALID_POLICY');
    }

    result.push(known);
  }

  return Object.freeze(result);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
