import path from 'node:path';

import { Injectable } from '@nestjs/common';

import {
  FileSystemAccessContext,
  type FileSystemAccessPolicy,
  type FileSystemPermission,
} from '../contracts/file-system.contracts.js';
import { FileSystemError } from '../contracts/file-system.error.js';
import { FileSystemService } from '../filesystem/file-system.service.js';
import { absolutePath, containsPath } from './file-system-path.js';

@Injectable()
export class FileSystemPolicyService {
  constructor(private readonly filesystem: FileSystemService) {}

  async assertAllowed(
    context: FileSystemAccessContext | undefined,
    permission: FileSystemPermission,
    location: string,
  ): Promise<string> {
    const requested = absolutePath(location);

    if (!this.evaluate(context, permission, requested)) {
      throw new FileSystemError('FILE_SYSTEM_PERMISSION_DENIED');
    }

    const canonical = await this.resolveExistingAncestor(requested);

    if (!this.evaluate(context, permission, canonical)) {
      throw new FileSystemError('FILE_SYSTEM_PERMISSION_DENIED');
    }

    return canonical;
  }

  async isAllowed(
    context: FileSystemAccessContext | undefined,
    permission: FileSystemPermission,
    location: string,
  ): Promise<boolean> {
    try {
      await this.assertAllowed(context, permission, location);

      return true;
    } catch (error) {
      if (error instanceof FileSystemError && error.code === 'FILE_SYSTEM_PERMISSION_DENIED') {
        return false;
      }

      throw error;
    }
  }

  private evaluate(
    context: FileSystemAccessContext | undefined,
    permission: FileSystemPermission,
    location: string,
  ): boolean {
    return (
      context instanceof FileSystemAccessContext &&
      context.policies.length > 0 &&
      context.policies.every((policy) => this.evaluatePolicy(policy, permission, location))
    );
  }

  private evaluatePolicy(
    policy: FileSystemAccessPolicy,
    permission: FileSystemPermission,
    location: string,
  ): boolean {
    let allowed = false;

    for (const scope of policy.scopes) {
      const root = absolutePath(scope.rootPath);

      if (!containsPath(root, location)) {
        continue;
      }

      if (scope.deny?.includes(permission)) {
        return false;
      }

      allowed ||= scope.allow.includes(permission);

      for (const rule of scope.rules ?? []) {
        if (path.isAbsolute(rule.path) || rule.path.includes('\0')) {
          throw new FileSystemError('FILE_SYSTEM_INVALID_PATH');
        }

        const target = path.resolve(root, rule.path);

        if (!containsPath(root, target)) {
          throw new FileSystemError('FILE_SYSTEM_INVALID_PATH');
        }

        const matches =
          rule.match === 'SUBTREE'
            ? containsPath(target, location)
            : path.relative(target, location) === '';

        if (!matches) {
          continue;
        }

        if (rule.deny?.includes(permission)) {
          return false;
        }

        allowed ||= rule.allow?.includes(permission) ?? false;
      }
    }

    return allowed;
  }

  private async resolveExistingAncestor(location: string): Promise<string> {
    try {
      return await this.filesystem.canonicalize(location);
    } catch (error) {
      if (!(error instanceof FileSystemError) || error.code !== 'FILE_SYSTEM_NOT_FOUND') {
        throw error;
      }

      try {
        await this.filesystem.readLink(location);
      } catch (linkError) {
        if (
          !(linkError instanceof FileSystemError) ||
          !['FILE_SYSTEM_NOT_FOUND', 'FILE_SYSTEM_INVALID_PATH'].includes(linkError.code)
        ) {
          throw linkError;
        }

        const parent = path.dirname(location);

        if (parent === location) {
          throw error;
        }

        return path.join(await this.resolveExistingAncestor(parent), path.basename(location));
      }

      throw new FileSystemError('FILE_SYSTEM_PERMISSION_DENIED');
    }
  }
}
