import { describe, expect, test } from 'vitest';

import { derivePipelineSlotId } from '../src/features/playbook-catalog/domain/pipeline-source.js';

describe('Playbook Catalog domain rules', () => {
  test('derives a stable bounded slot row id from the full slot identity', () => {
    const first = derivePipelineSlotId(
      'feature-development',
      'pipelines/feature.json',
      'developer',
    );
    expect(first).toBe(
      derivePipelineSlotId('feature-development', 'pipelines/feature.json', 'developer'),
    );
    expect(first).not.toBe(
      derivePipelineSlotId('feature-development', 'pipelines/other.json', 'developer'),
    );
    expect(first).toMatch(/^[a-z0-9_-]{1,64}$/);
  });
});
