import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Test, type TestingModule } from '@nestjs/testing';
import * as runtime from '@revisium/revo-agent-runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { agentRuntimeConfig } from '../../../src/config/agent-runtime.config.js';
import { AgentRuntimeLifecycle } from '../../../src/infrastructure/agent-runtime/agent-runtime-lifecycle.js';
import { AgentRuntimeModule } from '../../../src/infrastructure/agent-runtime/agent-runtime.module.js';
import {
  AGENT_DEFINITIONS,
  AGENT_MANAGER,
} from '../../../src/infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../../src/infrastructure/agent-runtime/agent-session-directories.js';

vi.mock('@revisium/revo-agent-runtime', async (importOriginal) => {
  const original = await importOriginal<typeof runtime>();

  return {
    ...original,
    createAgentManager: vi.fn<typeof runtime.createAgentManager>(original.createAgentManager),
  };
});

describe('Shared agent runtime composition', () => {
  let workspace: string;
  let module: TestingModule;
  let manager: runtime.AgentManager;
  let directories: AgentSessionDirectories;

  beforeEach(async () => {
    vi.clearAllMocks();
    workspace = await mkdtemp(join(tmpdir(), 'revo-runtime-composition-test-'));
    module = await Test.createTestingModule({
      imports: [AgentRuntimeModule, AgentRuntimeModule],
    })
      .overrideProvider(AGENT_DEFINITIONS)
      .useValue([])
      .overrideProvider(agentRuntimeConfig.KEY)
      .useValue({ workspaceDirectory: workspace, inheritedEnvironmentNames: ['HOME', 'PATH'] })
      .compile();
    manager = module.get<runtime.AgentManager>(AGENT_MANAGER);
    directories = module.get(AgentSessionDirectories);
  });

  afterEach(async () => {
    await manager.shutdown();
    await directories.cleanup();
    await module.close();
    await rm(workspace, { recursive: true, force: true });
  });

  it('creates one initialized manager when imported by multiple consumers', () => {
    expect(runtime.createAgentManager).toHaveBeenCalledTimes(1);
    expect(module.get(AGENT_MANAGER)).toBe(manager);
    expect(manager.sessions.list()).toEqual([]);
    expect(manager.listInvocations()).toEqual([]);
  });

  it('uses distinct safe output paths for different sessions and resume tokens', () => {
    const first = directories.outputDirectory('dlg_one');
    const second = directories.outputDirectory('dlg_two');
    const resumed = directories.outputDirectory('dlg_one', '../../token');

    expect(first).not.toBe(second);
    expect(first).not.toBe(resumed);
    expect(resumed).toMatch(/\.output-[^/]+\/[a-f0-9]{64}$/);
  });

  it('isolates output roots for two owners sharing a workspace', async () => {
    const other = new AgentSessionDirectories({
      workspaceDirectory: workspace,
      inheritedEnvironmentNames: [],
    });
    await other.initialize();

    expect(await readdir(workspace)).toHaveLength(2);
    await directories.cleanup();
    expect(await readdir(workspace)).toHaveLength(1);
    await other.cleanup();
    expect(await readdir(workspace)).toEqual([]);
  });

  it('drains the manager once before removing session outputs', async () => {
    const shutdown = vi.fn<runtime.AgentManager['shutdown']>().mockResolvedValue();
    const lifecycle = new AgentRuntimeLifecycle({ ...manager, shutdown }, directories);

    await Promise.all([lifecycle.stop(), lifecycle.stop()]);
    await lifecycle.cleanup();

    expect(shutdown).toHaveBeenCalledExactlyOnceWith('revo_core_shutdown');
    expect(await readdir(workspace)).toEqual([]);
  });

  it('retains outputs when the manager cannot confirm shutdown', async () => {
    const shutdown = vi
      .fn<runtime.AgentManager['shutdown']>()
      .mockRejectedValue(new Error('still active'));
    const lifecycle = new AgentRuntimeLifecycle({ ...manager, shutdown }, directories);

    await expect(lifecycle.stop()).rejects.toThrow('still active');
    await expect(lifecycle.cleanup()).rejects.toThrow('still active');
    expect(await readdir(workspace)).toHaveLength(1);
  });
});
