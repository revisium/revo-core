import { expect, test } from 'vitest';

import { AgentConfigurationCache } from '../../../src/features/agent-definitions/configurations/agent-configuration-cache.js';

test('publishes an empty completed catalogue independently of initialization', () => {
  const cache = new AgentConfigurationCache();
  expect(cache.snapshot()).toEqual({ status: 'NOT_INITIALIZED', catalogs: [] });

  cache.begin();
  expect(cache.snapshot()).toEqual({ status: 'LOADING', catalogs: [] });

  cache.publish([]);
  expect(cache.snapshot()).toEqual({ status: 'READY', catalogs: [] });
});

test('does not lose completion between subscribing and reading the first snapshot', async () => {
  const cache = new AgentConfigurationCache();
  cache.begin();
  const feed = cache.watch();
  cache.publish([]);

  expect(await feed.next()).toEqual({ done: false, value: { status: 'READY', catalogs: [] } });
  const pending = feed.next();
  await feed.return?.();
  expect(await pending).toEqual({ done: true, value: undefined });
});
