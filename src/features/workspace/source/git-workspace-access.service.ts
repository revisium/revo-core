import path from 'node:path';

import { Injectable } from '@nestjs/common';

import {
  FileSystemEntryType,
  type FileSystemAccessContext,
} from '../../file-system/contracts/file-system.contracts.js';
import { FileSystemApiService } from '../../file-system/file-system-api.service.js';
import { WorkspaceSourceError } from './workspace-source.error.js';

@Injectable()
export class GitWorkspaceAccessService {
  constructor(private readonly filesystem: FileSystemApiService) {}

  async check(rootPath: string, context: FileSystemAccessContext | undefined): Promise<boolean> {
    const marker = path.join(rootPath, '.git');
    const entry = await this.filesystem.getEntry({ path: marker }, context);
    let gitPath = marker;

    if (entry.type === FileSystemEntryType.FILE) {
      const pointer = await this.filesystem.readTextFile({ path: marker }, context);
      const target = /^gitdir: ([^\r\n\0]+)\r?\n?$/u.exec(pointer)?.[1];

      if (target === undefined) {
        return false;
      }

      gitPath = path.resolve(rootPath, target);
    } else if (entry.type !== FileSystemEntryType.DIRECTORY) {
      return false;
    }

    if (!(await this.filesystem.isDirectory({ path: gitPath }, context))) {
      return false;
    }

    await this.filesystem.readTextFile({ path: path.join(gitPath, 'HEAD') }, context);
    const commonPointer = await this.optionalText(path.join(gitPath, 'commondir'), context);
    const commonPath =
      commonPointer === null ? gitPath : path.resolve(gitPath, commonPointer.trimEnd());

    if (!(await this.filesystem.isDirectory({ path: commonPath }, context))) {
      return false;
    }

    await Promise.all(
      ['objects', 'refs'].map((name) =>
        this.filesystem.getEntry({ path: path.join(commonPath, name) }, context),
      ),
    );
    const configs = await Promise.all([
      this.optionalText(path.join(commonPath, 'config'), context),
      this.optionalText(path.join(gitPath, 'config.worktree'), context),
    ]);

    if (configs.some((config) => config !== null && hasIncludeSection(config))) {
      throw new WorkspaceSourceError();
    }

    return true;
  }

  private async optionalText(
    location: string,
    context: FileSystemAccessContext | undefined,
  ): Promise<string | null> {
    return (await this.filesystem.exists({ path: location }, context))
      ? this.filesystem.readTextFile({ path: location }, context)
      : null;
  }
}

function hasIncludeSection(config: string): boolean {
  return config.split(/\r?\n/u).some((line) => isIncludeSection(line.trimStart()));
}

function isIncludeSection(line: string): boolean {
  if (!line.startsWith('[')) {
    return false;
  }

  const section = line.slice(1).trimStart().toLowerCase();
  const suffix = section.startsWith('includeif')
    ? section.slice('includeif'.length)
    : section.startsWith('include')
      ? section.slice('include'.length)
      : undefined;

  return suffix !== undefined && isIncludeSectionSuffix(suffix);
}

function isIncludeSectionSuffix(suffix: string): boolean {
  const next = suffix[0];

  return next === undefined || next === ']' || next === '"' || next === '.' || next.trim() === '';
}
