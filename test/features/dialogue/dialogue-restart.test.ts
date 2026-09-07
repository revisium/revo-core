import { execFile, fork as forkProcess, type ChildProcess } from 'node:child_process';
import { cp } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeAll, describe, expect, test } from 'vitest';

import {
  startDialogueScenario,
  type DialogueScenario,
} from '../../support/dialogue/dialogue-scenario.js';

interface PreparedCrash {
  readonly type: 'prepared';
  readonly mode: 'admitted' | 'completed' | 'midstream' | 'saved';
  readonly dialogueId: string;
  readonly turnId: string;
  readonly fakePid: number | null;
  readonly cursor: string;
  readonly runtimeSessionId: string | null;
  readonly eventSequence: number;
  readonly rawEvents: readonly {
    readonly eventId: string;
    readonly sequence: number;
    readonly streamId: string;
    readonly type: string;
    readonly payload: unknown;
  }[];
  readonly history: readonly {
    readonly id: string;
    readonly sequence: string;
    readonly kind: string;
    readonly source: string;
    readonly text: string;
    readonly payload: unknown;
  }[];
}

const waitForMessage = <Message>(
  child: ChildProcess,
  predicate: (message: unknown) => message is Message,
): Promise<Message> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(`Timed out waiting for Core crash fixture IPC.${childErrors.get(child) ?? ''}`),
      );
    }, 10_000);
    const onMessage = (message: unknown): void => {
      if (isRecord(message) && message.type === 'error') {
        cleanup();
        reject(new Error(String(message.message)));
        return;
      }
      if (!predicate(message)) {
        return;
      }
      cleanup();
      resolve(message);
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      cleanup();
      reject(
        new Error(
          `Core crash fixture exited early: code=${code} signal=${signal}.${childErrors.get(child) ?? ''}`,
        ),
      );
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const cleanup = (): void => {
      clearTimeout(timer);
      child.off('message', onMessage);
      child.off('exit', onExit);
      child.off('error', onError);
    };
    child.on('message', onMessage);
    child.on('exit', onExit);
    child.on('error', onError);
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const execFileAsync = promisify(execFile);
const childErrors = new WeakMap<ChildProcess, string>();
const compiledChildPath = resolvePath(
  process.cwd(),
  '.poc/crash-dist/test/support/dialogue/core-crash-child.js',
);

const startChild = async (): Promise<ChildProcess> => {
  const child = forkProcess(compiledChildPath, [], {
    env: { ...process.env, REVO_AGENT_INHERIT_ENV: '' },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  child.stderr?.on('data', (chunk: Buffer | string) => {
    const existing = childErrors.get(child) ?? '';
    childErrors.set(child, `${existing}${String(chunk)}`.slice(-8_000));
  });
  await waitForMessage(
    child,
    (message): message is { readonly type: 'ready' } =>
      isRecord(message) && message.type === 'ready',
  );
  return child;
};

const prepare = async (
  child: ChildProcess,
  mode: PreparedCrash['mode'],
): Promise<PreparedCrash> => {
  const result = waitForMessage(
    child,
    (message): message is PreparedCrash => isRecord(message) && message.type === 'prepared',
  );
  child.send({ type: 'prepare', mode });
  return result;
};

const waitForExit = (child: ChildProcess): Promise<void> => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.off('exit', onExit);
      reject(new Error('Timed out waiting for Core crash fixture exit.'));
    }, 10_000);
    const onExit = (): void => {
      clearTimeout(timer);
      resolve();
    };
    child.once('exit', onExit);
  });
};

const stopOwnedProcess = (pid: number): void => {
  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    if (!isRecord(error) || error.code !== 'ESRCH') {
      throw error;
    }
  }
};

describe('Dialogue persistence across Core process boundaries', () => {
  let child: ChildProcess | undefined;
  let restarted: DialogueScenario | undefined;
  const ownedFakePids = new Set<number>();

  beforeAll(async () => {
    await execFileAsync('pnpm', [
      'exec',
      'tsc',
      '-p',
      'tsconfig.json',
      '--outDir',
      '.poc/crash-dist',
    ]);
    await cp('resources', '.poc/crash-dist/resources', { recursive: true });
  }, 30_000);

  afterEach(async () => {
    if (child?.pid !== undefined && child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await waitForExit(child);
    }
    ownedFakePids.forEach(stopOwnedProcess);
    ownedFakePids.clear();
    await restarted?.close();
    child = undefined;
    restarted = undefined;
  }, 30_000);

  test('preserves a completed dialogue across a normal Core restart', async () => {
    child = await startChild();
    const prepared = await prepare(child, 'completed');
    if (prepared.fakePid !== null) {
      ownedFakePids.add(prepared.fakePid);
    }
    const exited = waitForExit(child);
    child.send({ type: 'shutdown' });
    await exited;
    if (prepared.fakePid !== null) {
      ownedFakePids.delete(prepared.fakePid);
    }

    restarted = await startDialogueScenario();
    await expect(restarted.client.dialogue(prepared.dialogueId)).resolves.toMatchObject({
      status: 'READY',
      lastOutcome: 'COMPLETED',
    });
    await expect(restarted.client.history(prepared.dialogueId)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'AGENT', text: 'Completed before restart' }),
      ]),
    );
    expect(restarted.agent.pendingExecutionCount).toBe(0);
  }, 30_000);

  test.each(['saved', 'admitted', 'midstream'] as const)(
    'recovers a SIGKILL after %s without blindly resending the turn',
    async (mode) => {
      child = await startChild();
      const prepared = await prepare(child, mode);
      if (prepared.fakePid !== null) {
        ownedFakePids.add(prepared.fakePid);
      }
      const exited = waitForExit(child);
      child.kill('SIGKILL');
      await exited;
      if (prepared.fakePid !== null) {
        stopOwnedProcess(prepared.fakePid);
        ownedFakePids.delete(prepared.fakePid);
      }

      restarted = await startDialogueScenario();
      await expect(restarted.client.dialogue(prepared.dialogueId)).resolves.toMatchObject({
        status: 'UNCERTAIN',
        lastOutcome: 'UNCERTAIN',
        activeTurnId: null,
      });
      const storedHistory = await restarted.prisma.dialogueHistoryItem.findMany({
        where: { dialogueId: prepared.dialogueId },
        orderBy: { sequence: 'asc' },
      });
      expect(
        storedHistory
          .slice(0, prepared.history.length)
          .map(({ id, sequence, kind, source, text, payload }) => ({
            id,
            sequence: String(sequence),
            kind,
            source,
            text,
            payload,
          })),
      ).toEqual(prepared.history);
      const rawEvents =
        prepared.runtimeSessionId === null
          ? []
          : await restarted.prisma.agentSessionEvent.findMany({
              where: { sessionId: prepared.runtimeSessionId },
              orderBy: { sequence: 'asc' },
              select: { eventId: true, sequence: true, streamId: true, type: true, payload: true },
            });
      expect(rawEvents).toEqual(prepared.rawEvents);
      expect(rawEvents.at(-1)?.sequence ?? 0).toBe(prepared.eventSequence);
      const history = await restarted.client.history(prepared.dialogueId);
      expect(
        history.some(
          ({ source, status, text }) =>
            source === 'AGENT' && status === 'PARTIAL' && text === 'Committed crash prefix',
        ),
      ).toBe(mode === 'midstream');
      expect(history.some(({ source }) => source === 'AGENT')).toBe(mode === 'midstream');
      expect(restarted.agent.pendingExecutionCount).toBe(0);

      const replay = await restarted.client.subscribe(prepared.dialogueId, prepared.cursor);
      await expect(replay.next()).resolves.toMatchObject({ dialogueId: prepared.dialogueId });
      await replay.close();

      await restarted.client.reopen(prepared.dialogueId);
      const nextTurn = await restarted.client.send(prepared.dialogueId, 'Continue after recovery');
      const execution = await restarted.agent.expectTurn(nextTurn);
      expect(execution.prompt).toContain(`User: Crash ${mode} prompt`);
      expect(execution.prompt.includes('Assistant: Committed crash prefix')).toBe(
        mode === 'midstream',
      );
      await execution.text('Recovered answer');
      await execution.complete();
      await expect
        .poll(() => restarted?.client.dialogue(prepared.dialogueId))
        .toMatchObject({
          status: 'READY',
          lastOutcome: 'COMPLETED',
        });
    },
    30_000,
  );
});
