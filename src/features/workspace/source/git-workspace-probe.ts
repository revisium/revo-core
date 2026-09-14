import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const execute = promisify(execFile);

@Injectable()
export class GitWorkspaceProbe {
  constructor(private readonly config: ConfigService) {}

  async inspect(rootPath: string): Promise<{ rootPath: string } | null> {
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
      return {
        rootPath: root.stdout.replace(/\r?\n$/u, ''),
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
