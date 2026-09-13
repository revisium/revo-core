import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FileSystemAccessApiService } from '../../features/file-system-access/file-system-access-api.service.js';
import { FileSystemPermission } from '../../features/file-system/contracts/file-system.contracts.js';
import type { FileSystemAccessContext } from '../../features/file-system/contracts/file-system.contracts.js';
import { FileSystemAccessContext as FileSystemAccessContextImplementation } from '../../features/file-system/policy/file-system-access-context.js';

@Injectable()
export class FileSystemBrowserAccessService {
  constructor(
    private readonly config: ConfigService,
    private readonly policies: FileSystemAccessApiService,
  ) {}

  async getContext(): Promise<FileSystemAccessContext> {
    const policyId = this.config.get<string>('REVO_FILE_SYSTEM_BROWSER_POLICY_ID');
    const configured = this.config.get<string>('REVO_FILE_SYSTEM_BROWSER_ROOTS');
    const roots: unknown = configured === undefined ? [] : JSON.parse(configured);

    if (!Array.isArray(roots) || !roots.every((root: unknown) => typeof root === 'string')) {
      throw new Error('REVO_FILE_SYSTEM_BROWSER_ROOTS must be a JSON array of absolute paths.');
    }

    if (!policyId || roots.length === 0) {
      return FileSystemAccessContextImplementation.create({ scopes: [] });
    }

    const allow = [
      FileSystemPermission.LIST,
      FileSystemPermission.READ_METADATA,
      FileSystemPermission.READ_FILE,
      FileSystemPermission.CREATE_DIRECTORY,
    ];
    const authority = FileSystemAccessContextImplementation.create({
      scopes: roots.map((rootPath: string) => ({ rootPath, allow })),
    });

    return this.policies.resolveAccess({
      authority,
      rootPaths: roots,
      boundaryPolicyId: policyId,
      grantPolicyId: policyId,
    });
  }
}
