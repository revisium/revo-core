import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ConfigService } from '@nestjs/config';
import type { CreateRunInput, RunProfile } from '@revisium/revo-run';
import { afterEach, describe, expect, test } from 'vitest';

import { prepareRunProfile } from '../../../src/features/run/infrastructure/working-directory/run-profile-working-directory.js';
import { RunWorkingDirectoryCoordinator } from '../../../src/features/run/infrastructure/working-directory/run-working-directory-coordinator.js';
import { TemporaryRunDirectoryHost } from '../../../src/features/run/infrastructure/working-directory/temporary-run-directory-host.js';
import { singleAgentProfile, taskPipeline } from '../../fixtures/task-pipeline.js';
import { FakeRunManager } from '../../support/run/fake-run-manager.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  const roots = temporaryRoots.splice(0);
  await Promise.all(roots.map(async (root) => fsRm(root)));
});

describe('temporary run working directory', () => {
  test('copies the agent profile without mutating the selected profile', () => {
    const selectedProfile = profileWithAgentWorkingDirectory('selected-workspace');

    const prepared = prepareRunProfile(selectedProfile, 'r_workspace_123');

    expect(prepared.usesTemporaryWorkingDirectory).toBe(true);
    expect(prepared.profile).not.toBe(selectedProfile);
    expect(prepared.profile.bindings.agents['reviewer-binding']?.workspaceRef).toBe(
      'temporary-r_workspace_123',
    );
    expect(prepared.profile.bindings.agents['other-binding']?.workspaceRef).toBe(
      'temporary-r_workspace_123',
    );
    expect(selectedProfile.bindings.agents['reviewer-binding']?.workspaceRef).toBe(
      'selected-workspace',
    );
  });

  test('creates a contained mode-700 directory and rejects non-temporary references', async () => {
    const root = await testRoot();
    const directoryHost = createDirectoryHost(root);
    const runId = 'r_workspace_123';

    await expect(
      directoryHost.workspaces.acquire(`temporary-${runId}`, {
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('Temporary working directory reference is invalid.');
    expect(await pathExists(join(root, runId))).toBe(false);

    await directoryHost.allocate(runId);

    const allocation = await directoryHost.workspaces.acquire(`temporary-${runId}`, {
      signal: new AbortController().signal,
    });
    expect(allocation.absolutePath).toBe(join(root, runId));
    expect((await stat(allocation.absolutePath)).mode & 0o777).toBe(0o700);
    await expect(
      directoryHost.workspaces.inspect('folder:project', { signal: new AbortController().signal }),
    ).resolves.toBeUndefined();
    await expect(
      directoryHost.workspaces.acquire('temporary-../escape', {
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('Temporary working directory reference is invalid.');
  });

  test('rejects an aborted acquisition with AbortError', async () => {
    const directoryHost = createDirectoryHost(await testRoot());
    const controller = new AbortController();
    controller.abort();

    await expect(
      directoryHost.workspaces.acquire('temporary-r_workspace_123', {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  test('removes an allocated directory only after the manager becomes terminal', async () => {
    const root = await testRoot();
    const directoryHost = createDirectoryHost(root);
    const manager = new FakeRunManager();
    const coordinator = new RunWorkingDirectoryCoordinator(manager, directoryHost);
    const input = createAgentRunInput('r_workspace_123');
    const originalProfile = structuredClone(input.profile);

    await coordinator.createRun(input);
    const runPath = join(root, input.runId);
    expect(manager.createdInput?.profile).not.toBe(input.profile);
    expect(input.profile).toEqual(originalProfile);

    manager.resolveTerminal();
    await coordinator.waitForCleanup();
    expect(await pathExists(runPath)).toBe(false);
  });

  test('leaves pure runs untouched and does not create a working directory', async () => {
    const root = await testRoot();
    const directoryHost = createDirectoryHost(root);
    const manager = new FakeRunManager();
    const coordinator = new RunWorkingDirectoryCoordinator(manager, directoryHost);
    const input: CreateRunInput = {
      runId: 'r_pure_123',
      pipeline: taskPipeline(),
      profile: {
        schemaVersion: 'run-profile/v1',
        selections: {},
        bindings: { agents: {}, scripts: {} },
      },
      input: {},
    };

    await coordinator.createRun(input);

    expect(manager.createdInput?.profile).toBe(input.profile);
    expect(await pathExists(join(root, input.runId))).toBe(false);
  });

  test('stops cleanup waits without deleting a nonterminal directory', async () => {
    const root = await testRoot();
    const directoryHost = createDirectoryHost(root);
    const manager = new FakeRunManager();
    const coordinator = new RunWorkingDirectoryCoordinator(manager, directoryHost);

    await coordinator.createRun(createAgentRunInput('r_shutdown_123'));
    coordinator.beginShutdown();
    await coordinator.waitForCleanup();

    expect(await pathExists(join(root, 'r_shutdown_123'))).toBe(true);
  });

  test('cleans an allocation when manager admission fails', async () => {
    const root = await testRoot();
    const directoryHost = createDirectoryHost(root);
    const manager = new FakeRunManager();
    manager.createError = new Error('admission failed');
    const coordinator = new RunWorkingDirectoryCoordinator(manager, directoryHost);

    await expect(coordinator.createRun(createAgentRunInput('r_workspace_123'))).rejects.toThrow(
      'admission failed',
    );
    expect(await pathExists(join(root, 'r_workspace_123'))).toBe(false);
  });
});

function createDirectoryHost(root: string): TemporaryRunDirectoryHost {
  return new TemporaryRunDirectoryHost(
    new ConfigService({ run: { temporaryWorkingDirectoryRoot: root } }),
  );
}

async function testRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'revo-run-working-directory-'));
  temporaryRoots.push(root);
  return root;
}

function createAgentRunInput(runId: string): CreateRunInput {
  const selectedProfile = profileWithAgentWorkingDirectory('selected-workspace');

  return { runId, pipeline: taskPipeline(), profile: selectedProfile, input: {} };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function profileWithAgentWorkingDirectory(workspaceRef: string): RunProfile {
  const profile = singleAgentProfile();
  const binding = profile.bindings.agents['reviewer-binding'];
  if (binding === undefined) {
    throw new Error('Agent fixture binding is missing.');
  }

  return {
    ...profile,
    bindings: {
      ...profile.bindings,
      agents: {
        'reviewer-binding': { ...binding, workspaceRef },
        'other-binding': { ...binding, workspaceRef: 'other-selected-workspace' },
      },
    },
  };
}

async function fsRm(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}
