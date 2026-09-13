import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { FileSystemAccessContext } from '../../file-system/contracts/file-system.contracts.js';
import { FileSystemError } from '../../file-system/contracts/file-system.error.js';
import { GitWorkspaceAccessService } from './git-workspace-access.service.js';

const execute = promisify(execFile);

@Injectable()
export class GitWorkspaceProbe {
  constructor(
    private readonly config: ConfigService,
    private readonly access: GitWorkspaceAccessService,
  ) {}

  async inspect(
    rootPath: string,
    context: FileSystemAccessContext | undefined,
  ): Promise<{ rootPath: string; gitPath: string } | null> {
    try {
      if (!(await this.access.check(rootPath, context))) {
        return null;
      }
    } catch (error) {
      if (
        error instanceof FileSystemError &&
        ['FILE_SYSTEM_NOT_FOUND', 'FILE_SYSTEM_NOT_DIRECTORY'].includes(error.code)
      ) {
        return null;
      }

      throw error;
    }

    const options = {
      cwd: rootPath,
      timeout: 5000,
      maxBuffer: 16384,
      windowsHide: true,
      env: {
        PATH: this.config.get<string>('PATH'),
        SystemRoot: this.config.get<string>('SystemRoot'),
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
        GIT_OPTIONAL_LOCKS: '0',
        GIT_TERMINAL_PROMPT: '0',
      },
    };

    try {
      const root = await execute('git', ['rev-parse', '--show-toplevel'], options);
      const git = await execute('git', ['rev-parse', '--absolute-git-dir'], options);

      return {
        rootPath: root.stdout.replace(/\r?\n$/u, ''),
        gitPath: git.stdout.replace(/\r?\n$/u, ''),
      };
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'number'
      ) {
        return null;
      }

      throw error;
    }
  }
}
