import type { AgentConfigurationCatalog } from '@revisium/revo-agent-runtime';
import { expect, test } from 'vitest';

import { connectedConfiguration } from '../../../../src/features/agent-definitions/configurations/agent-configuration-projection.js';

test('projects connected providers and models while preserving catalog metadata', () => {
  const catalog: AgentConfigurationCatalog = {
    schemaVersion: 'agent-configuration-catalog/v2',
    agent: { id: 'agent', version: '1' },
    definitionDigest: 'digest',
    catalogRevision: 'revision',
    launch: { executable: 'agent', reportedVersion: '1' },
    options: [
      {
        id: 'model',
        name: 'Model',
        type: 'select',
        currentValue: 'provider/model',
        values: [
          { value: 'provider/model', name: 'Model' },
          { value: 'offline/hidden', name: 'Offline hidden' },
        ],
      },
      { id: 'effort', name: 'Effort', type: 'boolean', currentValue: true },
    ],
    model: {
      optionId: 'model',
      currentModel: 'provider/model',
      sessionAvailable: [
        { value: 'provider/model', name: 'Model' },
        { value: 'offline/hidden', name: 'Offline hidden' },
      ],
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
  };

  const projected = connectedConfiguration(catalog);
  if (projected === undefined) {
    throw new Error('Expected a connected catalog.');
  }

  expect(projected.catalogRevision).toBe('revision');
  expect(projected.model?.providers).toEqual([
    {
      id: 'provider',
      name: 'Provider',
      connected: true,
      models: [{ value: 'provider/model', name: 'Model', connected: true }],
    },
  ]);
  expect(projected.model?.sessionAvailable).toEqual([{ value: 'provider/model', name: 'Model' }]);
  expect(projected.options[0]).toMatchObject({
    values: [{ value: 'provider/model', name: 'Model' }],
  });
  expect(projected.options[1]).toMatchObject({ id: 'effort', currentValue: true });
});

test('falls back to a connected model when the persisted current model is offline', () => {
  const catalog = {
    schemaVersion: 'agent-configuration-catalog/v2' as const,
    agent: { id: 'agent', version: '1' },
    definitionDigest: 'digest',
    catalogRevision: 'revision',
    launch: { executable: 'agent', reportedVersion: '1' },
    options: [
      {
        id: 'model',
        name: 'Model',
        type: 'select' as const,
        currentValue: 'offline/model',
        values: [
          { value: 'offline/model', name: 'Offline' },
          { value: 'provider/model', name: 'Connected' },
        ],
      },
    ],
    model: {
      optionId: 'model',
      currentModel: 'offline/model',
      sessionAvailable: [{ value: 'provider/model', name: 'Connected' }],
      providers: [
        {
          id: 'provider',
          name: 'Provider',
          connected: true,
          models: [{ value: 'provider/model', name: 'Connected', connected: true }],
        },
      ],
    },
  };

  const projected = connectedConfiguration(catalog);

  expect(projected?.model).toMatchObject({
    currentModel: 'provider/model',
    currentProvider: { id: 'provider' },
  });
  expect(projected?.options[0]).toMatchObject({ currentValue: 'provider/model' });
});

test('omits a provider catalog when no connected model is selectable', () => {
  const catalog = {
    schemaVersion: 'agent-configuration-catalog/v2' as const,
    agent: { id: 'agent', version: '1' },
    definitionDigest: 'digest',
    catalogRevision: 'revision',
    launch: { executable: 'agent', reportedVersion: '1' },
    options: [
      {
        id: 'model',
        name: 'Model',
        type: 'select' as const,
        currentValue: 'model-a',
        values: [{ value: 'model-a', name: 'Model A' }],
      },
    ],
    model: {
      optionId: 'model',
      currentModel: 'offline/model',
      sessionAvailable: [{ value: 'offline/model', name: 'Offline' }],
      providers: [{ id: 'offline', name: 'Offline', connected: false, models: [] }],
    },
  };

  expect(connectedConfiguration(catalog)).toBeUndefined();
});

test('preserves ACP-only model values when providers are unavailable', () => {
  const catalog: AgentConfigurationCatalog = {
    schemaVersion: 'agent-configuration-catalog/v2',
    agent: { id: 'agent', version: '1' },
    definitionDigest: 'digest',
    catalogRevision: 'revision',
    launch: { executable: 'agent', reportedVersion: '1' },
    options: [
      {
        id: 'model',
        name: 'Model',
        type: 'select',
        currentValue: 'model-a',
        values: [{ value: 'model-a', name: 'Model A' }],
      },
    ],
    model: {
      optionId: 'model',
      currentModel: 'model-a',
      sessionAvailable: [{ value: 'model-a', name: 'Model A' }],
      providers: [],
    },
  };

  const projected = connectedConfiguration(catalog);
  expect(projected?.model?.sessionAvailable).toEqual([{ value: 'model-a', name: 'Model A' }]);
  expect(projected?.options[0]).toMatchObject({
    currentValue: 'model-a',
    values: [{ value: 'model-a', name: 'Model A' }],
  });
});
