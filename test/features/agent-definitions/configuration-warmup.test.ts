import { Logger } from '@nestjs/common';
import {
  AgentManagerError,
  type AgentConfigurationCatalog,
  type AgentManager,
  type AgentSessionAgentDescriptor,
} from '@revisium/revo-agent-runtime';
import { afterEach, expect, test, vi } from 'vitest';

import { AgentConfigurationCache } from '../../../src/features/agent-definitions/configurations/agent-configuration-cache.js';
import { AgentConfigurationWarmup } from '../../../src/features/agent-definitions/configurations/agent-configuration-warmup.js';
import { AgentSessionDirectories } from '../../../src/infrastructure/agent-runtime/agent-session-directories.js';

const descriptor = (id: string): AgentSessionAgentDescriptor => ({
  agent: { id, version: '1' },
  definitionDigest: id,
  displayName: id,
  capabilities: {
    cancellation: true,
    structuredResult: true,
    usage: true,
    session: {
      multiTurn: true,
      resume: 'native',
      interactions: { permission: true, input: true },
      updates: { message: true, tool: true, usage: true, plan: true, progress: true },
    },
  },
});
const catalog = (id: string): AgentConfigurationCatalog => ({
  schemaVersion: 'agent-configuration-catalog/v2',
  agent: { id, version: '1' },
  definitionDigest: id,
  catalogRevision: id,
  options: [],
  launch: { executable: 'test-cli', reportedVersion: '1' },
});
function scenario(ids: string[]) {
  const results = new Map(
    ids.map((id) => [id, Promise.withResolvers<AgentConfigurationCatalog>()]),
  );
  const manager = {
    sessions: { listAgents: () => ids.map(descriptor) },
    inspectConfiguration: vi.fn<AgentManager['inspectConfiguration']>((request) => {
      const result = results.get(request.agent.id);
      if (!result) {
        throw new Error('Unexpected inspection');
      }

      return result.promise;
    }),
  };
  const cache = new AgentConfigurationCache();
  const context = { environment: { inherit: ['HOME'], variables: {}, secrets: {} } };
  const directories = new AgentSessionDirectories({
    workspaceDirectory: '/test/workspace',
    inheritedEnvironmentNames: ['HOME'],
  });
  const warmup = new AgentConfigurationWarmup(manager, context, directories, cache);
  return {
    cache,
    manager,
    warmup,
    context,
    succeed(id: string) {
      results.get(id)?.resolve(catalog(id));
    },
    fail(id: string, error: Error) {
      results.get(id)?.reject(error);
    },
    started: () => manager.inspectConfiguration.mock.calls.map(([request]) => request.agent.id),
  };
}

afterEach(() => vi.restoreAllMocks());

test('returns from initialization while inspections are pending and publishes no partial results', async () => {
  const s = scenario(['a', 'b']);
  expect(s.warmup.onModuleInit()).toBeUndefined();
  expect(s.cache.snapshot()).toEqual({ status: 'LOADING', catalogs: [] });
  s.succeed('a');
  await Promise.resolve();
  expect(s.cache.snapshot().catalogs).toEqual([]);
  s.succeed('b');
  await expect.poll(() => s.cache.snapshot().status).toBe('READY');
  expect(s.cache.snapshot().catalogs).toEqual([catalog('a'), catalog('b')]);
});

test('limits inspection concurrency to two', async () => {
  const s = scenario(['a', 'b', 'c']);
  s.warmup.onModuleInit();
  expect(s.started()).toEqual(['a', 'b']);
  s.succeed('a');
  await expect.poll(s.started).toEqual(['a', 'b', 'c']);
  s.succeed('b');
  s.succeed('c');
  await expect.poll(() => s.cache.snapshot().status).toBe('READY');
});

test('warms each discovered agent at most once per process', async () => {
  const s = scenario(['a', 'a']);
  s.warmup.onModuleInit();
  s.warmup.onModuleInit();
  expect(s.started()).toEqual(['a']);
  s.succeed('a');
  await expect.poll(() => s.cache.snapshot().status).toBe('READY');
  s.warmup.onModuleInit();
  expect(s.started()).toEqual(['a']);
});

test('logs failed and timed-out providers while publishing only successful catalogues', async () => {
  const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const s = scenario(['failed', 'timed-out', 'ready']);
  s.warmup.onModuleInit();
  s.fail('failed', new Error('Private provider failure'));
  s.fail(
    'timed-out',
    new AgentManagerError({
      code: 'revo.agent.timeout',
      message: 'Timed out.',
      phase: 'execution',
      retryable: false,
    }),
  );
  await expect.poll(s.started).toContain('ready');
  s.succeed('ready');
  await expect.poll(() => s.cache.snapshot().status).toBe('READY');
  expect(s.cache.snapshot().catalogs).toEqual([catalog('ready')]);
  expect(logged).toHaveBeenCalledTimes(2);
  expect(logged).toHaveBeenCalledWith(
    expect.objectContaining({
      agentId: 'failed',
      error: expect.objectContaining({ message: 'Private provider failure' }),
    }),
  );
});

test('an empty discovery finishes with a ready empty list', async () => {
  const s = scenario([]);
  s.warmup.onModuleInit();
  await expect.poll(() => s.cache.snapshot()).toEqual({ status: 'READY', catalogs: [] });
});

test('shutdown aborts active inspections and does not start queued agents', async () => {
  const s = scenario(['a', 'b', 'c']);
  s.warmup.onModuleInit();
  const calls = s.manager.inspectConfiguration.mock.calls;
  expect(calls[0]).toEqual([
    { agent: { id: 'a', version: '1' }, workspace: { directory: '/test/workspace' } },
    { ...s.context, signal: expect.any(AbortSignal) },
  ]);
  expect(calls[0]?.[1]?.signal?.aborted).toBe(false);
  s.warmup.onModuleDestroy();
  expect(calls[0]?.[1]?.signal?.aborted).toBe(true);
  s.succeed('a');
  s.succeed('b');
  await Promise.resolve();
  await Promise.resolve();
  expect(s.started()).toEqual(['a', 'b']);
  expect(s.cache.snapshot().status).toBe('LOADING');
});
