import path from 'node:path';

import { Injectable } from '@nestjs/common';

import {
  FileSystemAccessContext,
  type FileSystemAccessPolicy,
  type FileSystemPathRule,
  type FileSystemPermission,
  type FileSystemScope,
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
      const scopeDecision = this.evaluateScope(scope, permission, location);

      if (scopeDecision === false) {
        return false;
      }

      allowed ||= scopeDecision === true;
    }

    return allowed;
  }

  private evaluateScope(
    scope: FileSystemScope,
    permission: FileSystemPermission,
    location: string,
  ): boolean | undefined {
    const root = absolutePath(scope.rootPath);

    if (!containsPath(root, location)) {
      return undefined;
    }

    if (scope.deny?.includes(permission)) {
      return false;
    }

    let allowed = scope.allow.includes(permission);

    for (const rule of scope.rules ?? []) {
      const ruleDecision = this.evaluateRule(rule, root, permission, location);

      if (ruleDecision === false) {
        return false;
      }

      allowed ||= ruleDecision === true;
    }

    return allowed ? true : undefined;
  }

  private evaluateRule(
    rule: FileSystemPathRule,
    root: string,
    permission: FileSystemPermission,
    location: string,
  ): boolean | undefined {
    if (path.isAbsolute(rule.path) || rule.path.includes('\0')) {
      throw new FileSystemError('FILE_SYSTEM_INVALID_PATH');
    }

    const target = path.resolve(root, rule.path);

    if (!containsPath(root, target)) {
      throw new FileSystemError('FILE_SYSTEM_INVALID_PATH');
    }

    if (!this.ruleMatches(rule, target, location)) {
      return undefined;
    }

    if (rule.deny?.includes(permission)) {
      return false;
    }

    return rule.allow?.includes(permission) ? true : undefined;
  }

  private ruleMatches(rule: FileSystemPathRule, target: string, location: string): boolean {
    if (rule.match === 'SUBTREE') {
      return containsPath(target, location);
    }

    return path.relative(target, location) === '';
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
