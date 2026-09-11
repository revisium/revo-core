import { expect, test } from 'vitest';

import { connectedConfiguration } from '../../../../src/features/agent-definitions/configurations/agent-configuration-projection.js';

test('projects connected providers and models while preserving catalog metadata', () => {
  const catalog = {
    schemaVersion: 'agent-configuration-catalog/v2',
    agent: { id: 'agent', version: '1' },
    definitionDigest: 'digest',
    catalogRevision: 'revision',
    launch: { executable: 'agent', reportedVersion: '1' },
    options: [],
    model: {
      optionId: 'model',
      currentModel: 'provider/model',
      sessionAvailable: [],
      providers: [
        {
          id: 'provider',
          name: 'Provider',
          connected: true,
          models: [
            { value: 'provider/model', name: 'Model', connected: true },
            { value: 'provider/hidden', name: 'Hidden', connected: false },
          ],
        },
        { id: 'offline', name: 'Offline', connected: false, models: [] },
      ],
    },
  } as never;

  const projected = connectedConfiguration(catalog);
  expect(projected.catalogRevision).toBe('revision');
  expect(projected.model?.providers).toEqual([
    {
      id: 'provider',
      name: 'Provider',
      connected: true,
      models: [{ value: 'provider/model', name: 'Model', connected: true }],
    },
  ]);
});
