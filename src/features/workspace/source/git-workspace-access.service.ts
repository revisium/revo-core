import path from 'node:path';

import { Injectable } from '@nestjs/common';

import type { FileSystemClient } from '../../file-system/contracts/file-system-client.js';
import {
  FileSystemEntryType,
  FileSystemAccessContext,
} from '../../file-system/contracts/file-system.contracts.js';
import { FileSystemApiService } from '../../file-system/file-system-api.service.js';
import { WorkspaceSourceError } from './workspace-source.error.js';

@Injectable()
export class GitWorkspaceAccessService {
  constructor(private readonly filesystem: FileSystemApiService) {}

  async check(rootPath: string, context: FileSystemAccessContext | undefined): Promise<boolean> {
    const marker = path.join(rootPath, '.git');
    const entry = await this.filesystem.getEntry({ path: marker }, context);
    const fs = this.filesystem.withAccess(
      context ?? FileSystemAccessContext.create({ scopes: [] }),
    );
    let gitPath = marker;

    if (entry.type === FileSystemEntryType.FILE) {
      const pointer = await fs.readTextFile({ path: marker });
      const target = /^gitdir: ([^\r\n\0]+)\r?\n?$/u.exec(pointer)?.[1];

      if (target === undefined) {
        return false;
      }

      gitPath = path.resolve(rootPath, target);
    } else if (entry.type !== FileSystemEntryType.DIRECTORY) {
      return false;
    }

    if (!(await fs.isDirectory({ path: gitPath }))) {
      return false;
    }

    await fs.readTextFile({ path: path.join(gitPath, 'HEAD') });
    const commonPointer = await this.optionalText(fs, path.join(gitPath, 'commondir'));
    const commonPath =
      commonPointer === null ? gitPath : path.resolve(gitPath, commonPointer.trimEnd());

    if (!(await fs.isDirectory({ path: commonPath }))) {
      return false;
    }

    await Promise.all(
      ['objects', 'refs'].map((name) => fs.getEntry({ path: path.join(commonPath, name) })),
    );
    const configs = await Promise.all([
      this.optionalText(fs, path.join(commonPath, 'config')),
      this.optionalText(fs, path.join(gitPath, 'config.worktree')),
    ]);

    if (
      configs.some(
        (config) => config !== null && /^\s*\[\s*include(?:if)?(?=[\s."\]])/imu.test(config),
      )
    ) {
      throw new WorkspaceSourceError();
    }

    return true;
  }

  private async optionalText(fs: FileSystemClient, location: string): Promise<string | null> {
    return (await fs.exists({ path: location })) ? fs.readTextFile({ path: location }) : null;
  }
}
