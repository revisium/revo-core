import path from 'node:path';

import { Injectable } from '@nestjs/common';

import {
  FileSystemPermission,
  type FileSystemAccessContext,
  type FileSystemEntry,
} from '../contracts/file-system.contracts.js';
import { FileSystemError } from '../contracts/file-system.error.js';
import { FileSystemService } from '../filesystem/file-system.service.js';
import { FileSystemPolicyService } from '../policy/file-system-policy.service.js';

@Injectable()
export class FileSystemListingService {
  constructor(
    private readonly filesystem: FileSystemService,
    private readonly policy: FileSystemPolicyService,
  ) {}

  async entry(
    context: FileSystemAccessContext | undefined,
    location: string,
  ): Promise<FileSystemEntry> {
    await this.policy.assertAllowed(context, FileSystemPermission.READ_METADATA, location);
    const metadata = await this.filesystem.metadata(location);

    return {
      name: path.basename(location) || location,
      path: location,
      type: metadata.type,
      isSymlink: metadata.isSymlink,
    };
  }

  async visible(
    context: FileSystemAccessContext | undefined,
    location: string,
    permission = FileSystemPermission.READ_METADATA,
  ): Promise<boolean> {
    try {
      return await this.policy.isAllowed(context, permission, location);
    } catch (error) {
      if (
        error instanceof FileSystemError &&
        ['FILE_SYSTEM_NOT_FOUND', 'FILE_SYSTEM_ACCESS_DENIED', 'FILE_SYSTEM_INVALID_PATH'].includes(
          error.code,
        )
      ) {
        return false;
      }

      throw error;
    }
  }
}
