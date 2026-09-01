import type { CreateRunInput, CreateRunResult, RunManager } from '@revisium/revo-run';

import { prepareRunProfile } from './run-profile-working-directory.js';
import { TemporaryRunDirectoryHost } from './temporary-run-directory-host.js';

type RunManagerForWorkingDirectory = Pick<RunManager, 'createRun' | 'waitForTerminal'>;

export class RunWorkingDirectoryCoordinator {
  private readonly cleanups = new Set<Promise<void>>();
  private readonly shutdown = new AbortController();

  constructor(
    private readonly manager: RunManagerForWorkingDirectory,
    private readonly workingDirectoryHost: TemporaryRunDirectoryHost,
    private readonly reportError: (error: unknown) => void = () => undefined,
  ) {}

  async createRun(input: CreateRunInput): Promise<CreateRunResult> {
    const prepared = prepareRunProfile(input.profile, input.runId);
    if (prepared.usesTemporaryWorkingDirectory) {
      await this.workingDirectoryHost.allocate(input.runId);
    }

    try {
      const result = await this.manager.createRun({ ...input, profile: prepared.profile });
      if (prepared.usesTemporaryWorkingDirectory) {
        this.scheduleCleanup(result.runId);
      }
      return result;
    } catch (error) {
      await this.cleanupFailedAdmission(input.runId, prepared.usesTemporaryWorkingDirectory);
      throw error;
    }
  }

  beginShutdown(): void {
    this.shutdown.abort();
  }

  async waitForCleanup(): Promise<void> {
    await Promise.all(this.cleanups);
  }

  private scheduleCleanup(runId: string): void {
    const cleanup = this.cleanupAfterTerminal(runId);
    this.cleanups.add(cleanup);
    void cleanup.then(() => this.cleanups.delete(cleanup));
  }

  private async cleanupAfterTerminal(runId: string): Promise<void> {
    try {
      await this.manager.waitForTerminal(runId, { signal: this.shutdown.signal });
      await this.workingDirectoryHost.cleanup(runId);
    } catch (error) {
      if (!this.shutdown.signal.aborted) {
        this.reportError(error);
      }
    }
  }

  private async cleanupFailedAdmission(runId: string, allocated: boolean): Promise<void> {
    if (!allocated) {
      return;
    }

    try {
      await this.workingDirectoryHost.cleanup(runId);
    } catch (error) {
      this.reportError(error);
    }
  }
}
