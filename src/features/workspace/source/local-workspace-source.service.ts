import path from 'node:path';

import { Injectable } from '@nestjs/common';

import { FileSystemEntryType } from '../../file-system/contracts/file-system.contracts.js';
import { FileSystemError } from '../../file-system/contracts/file-system.error.js';
import { FileSystemApiService } from '../../file-system/file-system-api.service.js';
import {
  WorkspaceAvailability,
  WorkspaceType,
  type WorkspaceCheck,
} from '../contracts/workspace.contracts.js';
import { GitWorkspaceProbe } from './git-workspace-probe.js';

@Injectable()
export class LocalWorkspaceSourceService {
  constructor(
    private readonly filesystem: FileSystemApiService,
    private readonly git: GitWorkspaceProbe,
  ) {}

  async check(sourcePath: string, type: WorkspaceType): Promise<WorkspaceCheck> {
    const lastCheckedAt = new Date();

    try {
      return await this.inspect(sourcePath, type, lastCheckedAt);
    } catch (error) {
      if (error instanceof FileSystemError) {
        switch (error.code) {
          case 'FILE_SYSTEM_INVALID_PATH':
          case 'FILE_SYSTEM_NOT_FOUND':
            return {
              availability: WorkspaceAvailability.NOT_FOUND,
              lastCheckedAt,
              lastErrorCode: error.code,
            };
          case 'FILE_SYSTEM_NOT_DIRECTORY':
            return {
              availability: WorkspaceAvailability.NOT_DIRECTORY,
              lastCheckedAt,
              lastErrorCode: error.code,
            };
          case 'FILE_SYSTEM_ACCESS_DENIED':
            return {
              availability: WorkspaceAvailability.ACCESS_DENIED,
              lastCheckedAt,
              lastErrorCode: error.code,
            };
          case 'FILE_SYSTEM_ALREADY_EXISTS':
          case 'FILE_SYSTEM_INVALID_NAME':
          case 'FILE_SYSTEM_IO_ERROR':
          case 'FILE_SYSTEM_TOO_LARGE':
            return {
              availability: WorkspaceAvailability.CHECK_FAILED,
              lastCheckedAt,
              lastErrorCode: error.code,
            };
        }
      }

      return {
        availability: WorkspaceAvailability.CHECK_FAILED,
        lastCheckedAt,
        lastErrorCode: 'WORKSPACE_CHECK_FAILED',
      };
    }
  }

  private async inspect(
    sourcePath: string,
    type: WorkspaceType,
    lastCheckedAt: Date,
  ): Promise<WorkspaceCheck> {
    const entry = await this.filesystem.getEntry({ path: sourcePath });

    if (entry.type !== FileSystemEntryType.DIRECTORY) {
      return {
        availability: WorkspaceAvailability.NOT_DIRECTORY,
        lastCheckedAt,
        lastErrorCode: 'FILE_SYSTEM_NOT_DIRECTORY',
      };
    }

    if (type === WorkspaceType.repository && !(await this.isRepository(sourcePath))) {
      return {
        availability: WorkspaceAvailability.INVALID_REPOSITORY,
        lastCheckedAt,
        lastErrorCode: 'WORKSPACE_INVALID_REPOSITORY',
      };
    }

    return { availability: WorkspaceAvailability.AVAILABLE, lastCheckedAt, lastErrorCode: null };
  }

  private async isRepository(sourcePath: string): Promise<boolean> {
    const canonical = await this.filesystem.canonicalize({ path: sourcePath });
    const marker = path.join(sourcePath, '.git');

    if (!(await this.filesystem.exists({ path: marker }))) {
      return false;
    }

    const repository = await this.git.inspect(sourcePath);

    if (repository === null) {
      return false;
    }

    const gitRoot = await this.filesystem.canonicalize({ path: repository.rootPath });

    return path.relative(canonical, gitRoot) === '';
  }
}
