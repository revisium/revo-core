import { chmod, mkdir, rm } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CredentialResolver, ResourceResolver, WorkspaceResolver } from '@revisium/revo-run';

import { TEMPORARY_WORKING_DIRECTORY_REF_PREFIX } from './run-profile-working-directory.js';

const RUN_ID_PATTERN = /^r[A-Za-z0-9._-]{0,127}$/;
const DIRECTORY_MODE = 0o700;

@Injectable()
export class TemporaryRunDirectoryHost {
  private readonly rootPath: string;
  private readonly allocatedRunIds = new Set<string>();

  readonly resources: ResourceResolver = {
    inspect: () => Promise.resolve(undefined),
  };

  readonly credentials: CredentialResolver = {
    inspect: () => Promise.resolve(undefined),
    acquire: () => Promise.reject(new Error('Run credentials are unavailable.')),
  };

  readonly workspaces: WorkspaceResolver = {
    inspect: (workspaceRef) =>
      Promise.resolve(
        !this.isAllocatedReference(workspaceRef)
          ? undefined
          : { workspaceId: workspaceRef, repositoryId: workspaceRef },
      ),
    acquire: async (workspaceRef, context) => {
      if (context.signal.aborted) {
        const error = new Error('Workspace acquisition was aborted.');
        error.name = 'AbortError';
        throw error;
      }

      const runId = this.parseRunId(workspaceRef);
      if (runId === undefined || !this.allocatedRunIds.has(runId)) {
        throw new Error('Temporary working directory reference is invalid.');
      }

      return {
        workspaceId: workspaceRef,
        repositoryId: workspaceRef,
        absolutePath: this.pathFor(runId),
      };
    },
  };

  constructor(config: ConfigService) {
    this.rootPath = resolve(config.getOrThrow<string>('run.temporaryWorkingDirectoryRoot'));
  }

  async allocate(runId: string): Promise<void> {
    this.assertRunId(runId);
    await this.ensureRoot();
    const workingDirectoryPath = this.pathFor(runId);
    let created = false;

    try {
      await mkdir(workingDirectoryPath, { mode: DIRECTORY_MODE });
      created = true;
      await chmod(workingDirectoryPath, DIRECTORY_MODE);
      this.allocatedRunIds.add(runId);
    } catch (error) {
      if (created) {
        await rm(workingDirectoryPath, { recursive: true, force: true });
      }

      throw error;
    }
  }

  async cleanup(runId: string): Promise<void> {
    if (!this.allocatedRunIds.has(runId)) {
      return;
    }

    await rm(this.pathFor(runId), { recursive: true, force: true });
    this.allocatedRunIds.delete(runId);
  }

  private async ensureRoot(): Promise<void> {
    await mkdir(this.rootPath, { recursive: true, mode: DIRECTORY_MODE });
    await chmod(this.rootPath, DIRECTORY_MODE);
  }

  private pathFor(runId: string): string {
    const workingDirectoryPath = resolve(this.rootPath, runId);
    const pathFromRoot = relative(this.rootPath, workingDirectoryPath);
    if (
      pathFromRoot === '' ||
      pathFromRoot.startsWith('..') ||
      isAbsolute(pathFromRoot) ||
      pathFromRoot !== runId
    ) {
      throw new Error('Temporary working directory path escapes its root.');
    }

    return join(this.rootPath, runId);
  }

  private parseRunId(workspaceRef: string): string | undefined {
    if (!workspaceRef.startsWith(TEMPORARY_WORKING_DIRECTORY_REF_PREFIX)) {
      return undefined;
    }

    const runId = workspaceRef.slice(TEMPORARY_WORKING_DIRECTORY_REF_PREFIX.length);
    return RUN_ID_PATTERN.test(runId) ? runId : undefined;
  }

  private isAllocatedReference(workspaceRef: string): boolean {
    const runId = this.parseRunId(workspaceRef);
    return runId !== undefined && this.allocatedRunIds.has(runId);
  }

  private assertRunId(runId: string): void {
    if (!RUN_ID_PATTERN.test(runId)) {
      throw new Error('Run ID is invalid for a temporary working directory.');
    }
  }
}
