import type { CreateRunInput, RunManager, RunSnapshot } from '@revisium/revo-run';

export class FakeRunManager implements Pick<RunManager, 'createRun' | 'waitForTerminal'> {
  snapshot: RunSnapshot = {
    schemaVersion: 'run-snapshot/v1',
    runId: 'r_workspace_123',
    status: 'running',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    terminal: null,
  };
  createError: Error | undefined;
  createdInput: CreateRunInput | undefined;
  private terminalWaiters: Array<(snapshot: RunSnapshot) => void> = [];

  async createRun(input: CreateRunInput): Promise<{ runId: string }> {
    if (this.createError !== undefined) {
      throw this.createError;
    }
    this.createdInput = input;
    this.snapshot = { ...this.snapshot, runId: input.runId };
    return { runId: input.runId };
  }

  waitForTerminal(_runId: string, input: { signal?: AbortSignal } = {}): Promise<RunSnapshot> {
    if (input.signal?.aborted) {
      return Promise.reject(new Error('aborted'));
    }

    return new Promise((resolve, reject) => {
      this.terminalWaiters.push(resolve);
      input.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  }

  resolveTerminal(): void {
    this.snapshot = terminalSnapshot(this.snapshot.runId);
    for (const resolve of this.terminalWaiters.splice(0)) {
      resolve(this.snapshot);
    }
  }
}

function terminalSnapshot(runId: string): RunSnapshot {
  return {
    schemaVersion: 'run-snapshot/v1',
    runId,
    status: 'succeeded',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    terminal: { kind: 'succeeded', outcome: 'ok', output: {} },
  };
}
