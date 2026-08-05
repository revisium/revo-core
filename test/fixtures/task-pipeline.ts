import type { PipelineDefinition } from '@revisium/revo-pipeline';

export const taskPipeline = (): PipelineDefinition => ({
  schemaVersion: 1,
  entry: 'work',
  facts: [],
  nodes: [
    {
      kind: 'task',
      key: 'work',
      outcomes: {
        completed: 'done',
        failed: 'failed',
        cancelled: 'failed',
        skipped: 'done',
      },
    },
    { kind: 'terminal', key: 'done', outcome: 'succeeded' },
    { kind: 'terminal', key: 'failed', outcome: 'failed' },
  ],
});

export const invalidPipeline = (): PipelineDefinition => ({
  schemaVersion: 1,
  entry: 'missing',
  facts: [],
  nodes: [],
});
