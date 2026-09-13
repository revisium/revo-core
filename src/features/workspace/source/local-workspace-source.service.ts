import path from 'node:path';

import { Injectable } from '@nestjs/common';

import {
  FileSystemEntryType,
  type FileSystemAccessContext,
} from '../../file-system/contracts/file-system.contracts.js';
import { FileSystemError } from '../../file-system/contracts/file-system.error.js';
import { FileSystemApiService } from '../../file-system/file-system-api.service.js';
import {
  WorkspaceAvailability,
  WorkspaceType,
  type WorkspaceCheck,
} from '../contracts/workspace.contracts.js';
import { GitWorkspaceProbe } from './git-workspace-probe.js';
import { WorkspaceSourceError } from './workspace-source.error.js';

@Injectable()
export class LocalWorkspaceSourceService {
  constructor(
    private readonly filesystem: FileSystemApiService,
    private readonly git: GitWorkspaceProbe,
  ) {}

  async check(
    sourcePath: string,
    type: WorkspaceType,
    access: FileSystemAccessContext | undefined,
  ): Promise<WorkspaceCheck> {
    const lastCheckedAt = new Date();

    try {
      const entry = await this.filesystem.getEntry({ path: sourcePath }, access);

      if (entry.type !== FileSystemEntryType.DIRECTORY) {
        return {
          availability: WorkspaceAvailability.NOT_DIRECTORY,
          lastCheckedAt,
          lastErrorCode: 'FILE_SYSTEM_NOT_DIRECTORY',
        };
      }

      if (type === WorkspaceType.repository) {
        const canonical = await this.filesystem.canonicalize({ path: sourcePath }, access);
        const marker = path.join(sourcePath, '.git');

        if (!(await this.filesystem.exists({ path: marker }, access))) {
          return {
            availability: WorkspaceAvailability.INVALID_REPOSITORY,
            lastCheckedAt,
            lastErrorCode: 'WORKSPACE_INVALID_REPOSITORY',
          };
        }

        const repository = await this.git.inspect(sourcePath, access);

        if (repository === null) {
          return {
            availability: WorkspaceAvailability.INVALID_REPOSITORY,
            lastCheckedAt,
            lastErrorCode: 'WORKSPACE_INVALID_REPOSITORY',
          };
        }

        const gitRoot = await this.filesystem.canonicalize({ path: repository.rootPath }, access);
        await this.filesystem.getEntry({ path: repository.gitPath }, access);

        if (path.relative(canonical, gitRoot) !== '') {
          return {
            availability: WorkspaceAvailability.INVALID_REPOSITORY,
            lastCheckedAt,
            lastErrorCode: 'WORKSPACE_INVALID_REPOSITORY',
          };
        }
      }

      return { availability: WorkspaceAvailability.AVAILABLE, lastCheckedAt, lastErrorCode: null };
    } catch (error) {
      if (error instanceof WorkspaceSourceError) {
        return {
          availability: WorkspaceAvailability.CHECK_FAILED,
          lastCheckedAt,
          lastErrorCode: error.code,
        };
      }

      if (error instanceof FileSystemError) {
        switch (error.code) {
          case 'FILE_SYSTEM_PERMISSION_DENIED':
          case 'FILE_SYSTEM_INVALID_POLICY':
          case 'FILE_SYSTEM_INVALID_PATH':
          case 'FILE_SYSTEM_POLICY_UNAVAILABLE':
            throw error;
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
}
