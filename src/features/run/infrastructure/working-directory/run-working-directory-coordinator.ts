import {
  RunManagerError,
  type CreateRunInput,
  type CreateRunResult,
  type RunManager,
} from '@revisium/revo-run';

import { prepareRunProfile } from './run-profile-working-directory.js';
import { TemporaryRunDirectoryHost } from './temporary-run-directory-host.js';

type RunManagerForWorkingDirectory = Pick<RunManager, 'createRun' | 'waitForTerminal'>;

export class RunWorkingDirectoryCoordinator {
  private readonly cleanups = new Set<Promise<void>>();
  private readonly allocatedRunIds = new Set<string>();
  private readonly shutdown = new AbortController();
  private acceptingRuns = true;

  constructor(
    private readonly manager: RunManagerForWorkingDirectory,
    private readonly workingDirectoryHost: TemporaryRunDirectoryHost,
    private readonly reportError: (error: unknown) => void = () => undefined,
  ) {}

  async createRun(input: CreateRunInput): Promise<CreateRunResult> {
    this.assertAcceptingRuns();
    const prepared = prepareRunProfile(input.profile, input.runId);
    let allocated = false;

    try {
      if (prepared.usesTemporaryWorkingDirectory) {
        await this.workingDirectoryHost.allocate(input.runId);
        allocated = true;
        this.allocatedRunIds.add(input.runId);
        this.assertAcceptingRuns();
      }
      const result = await this.manager.createRun({ ...input, profile: prepared.profile });

      if (prepared.usesTemporaryWorkingDirectory) {
        this.scheduleCleanup(result.runId);
      }

      return result;
    } catch (error) {
      await this.cleanupFailedAdmission(input.runId, allocated);
      throw error;
    }
  }

  beginShutdown(): void {
    this.acceptingRuns = false;
    this.shutdown.abort();
  }

  async waitForCleanup(): Promise<void> {
    await Promise.all(this.cleanups);
  }

  async cleanupAllocatedWorkingDirectories(): Promise<void> {
    const results = await Promise.allSettled(
      [...this.allocatedRunIds].map(async (runId) => await this.cleanupRun(runId)),
    );
    const failures: unknown[] = [];

    for (const result of results) {
      if (result.status === 'rejected') {
        failures.push(result.reason);
      }
    }

    if (failures.length > 0) {
      throw new AggregateError(failures, 'Temporary run working directory cleanup failed.');
    }
  }

  private scheduleCleanup(runId: string): void {
    const cleanup = this.cleanupAfterTerminal(runId);
    this.cleanups.add(cleanup);
    void cleanup.then(() => this.cleanups.delete(cleanup));
  }

  private async cleanupAfterTerminal(runId: string): Promise<void> {
    try {
      await this.manager.waitForTerminal(runId, { signal: this.shutdown.signal });
      await this.cleanupRun(runId);
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
      await this.cleanupRun(runId);
    } catch (error) {
      this.reportError(error);
    }
  }

  private async cleanupRun(runId: string): Promise<void> {
    await this.workingDirectoryHost.cleanup(runId);
    this.allocatedRunIds.delete(runId);
  }

  private assertAcceptingRuns(): void {
    if (!this.acceptingRuns) {
      throw new RunManagerError('manager_not_started', { lifecycle: 'stopping' });
    }
  }
}
