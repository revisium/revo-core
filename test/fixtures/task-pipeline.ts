import type { PipelineSourcePackage, RunProfile } from '@revisium/revo-run';

const emptySchema = {
  type: 'object' as const,
  properties: {},
  required: [],
  additionalProperties: false as const,
};

export const taskPipeline = (): PipelineSourcePackage => ({
  schemaVersion: 'pipeline-source/v1',
  key: 'core-terminal',
  entryModule: 'main',
  maximumTotalActivities: 1,
  modules: [
    {
      key: 'main',
      inputSchema: emptySchema,
      outputSchema: emptySchema,
      region: {
        key: 'root',
        inputSchema: emptySchema,
        entry: 'done',
        outputSchema: emptySchema,
        exits: [{ outcome: 'ok', outputSchema: emptySchema }],
        nodes: [{ kind: 'end', id: 'done', outcome: 'ok', output: {} }],
      },
    },
  ],
});

export const taskProfile = (): RunProfile => ({
  schemaVersion: 'run-profile/v1',
  selections: {},
  bindings: { agents: {}, scripts: {} },
});

export const invalidPipeline = (): unknown => ({ schemaVersion: 'pipeline-source/v1' });

export const brokenPipeline = (): PipelineSourcePackage => {
  const pipeline = taskPipeline();
  const [entryModule, ...remainingModules] = pipeline.modules;

  return {
    ...pipeline,
    modules: [
      {
        ...entryModule,
        region: { ...entryModule.region, entry: 'missing' },
      },
      ...remainingModules,
    ],
  };
};

export const singleAgentPipeline = (): PipelineSourcePackage => ({
  ...taskPipeline(),
  key: 'core-agent',
  maximumTotalActivities: 1,
  modules: [
    {
      key: 'main',
      inputSchema: emptySchema,
      outputSchema: emptySchema,
      region: {
        key: 'root',
        inputSchema: emptySchema,
        entry: 'review',
        outputSchema: emptySchema,
        exits: [{ outcome: 'ok', outputSchema: emptySchema }],
        nodes: [
          {
            kind: 'agent',
            id: 'review',
            strategies: [
              { kind: 'single', routes: { succeeded: 'done', failed: 'done', cancelled: 'done' } },
            ],
            input: { prompt: { kind: 'literal', value: 'Review CRI.' } },
            inputSchema: {
              type: 'object',
              properties: { prompt: { type: 'string', enum: ['Review CRI.'] } },
              required: ['prompt'],
              additionalProperties: false,
            },
            outputSchema: emptySchema,
          },
          { kind: 'end', id: 'done', outcome: 'ok', output: {} },
        ],
      },
    },
  ],
});

export const singleAgentProfile = (): RunProfile => ({
  schemaVersion: 'run-profile/v1',
  selections: {
    review: {
      strategy: 'single',
      participant: { key: 'reviewer', bindingKey: 'reviewer-binding' },
    },
  },
  bindings: {
    agents: {
      'reviewer-binding': {
        definition: { id: 'reviewer', version: '1' },
        parameters: {},
        permissions: {},
        workspaceRef: 'unavailable-workspace',
      },
    },
    scripts: {},
  },
});

export const echoPipeline = (): PipelineSourcePackage => ({
  ...taskPipeline(),
  key: 'core-echo',
  maximumTotalActivities: 1,
  modules: [
    {
      key: 'main',
      inputSchema: emptySchema,
      outputSchema: emptySchema,
      region: {
        key: 'root',
        inputSchema: emptySchema,
        entry: 'echo',
        outputSchema: emptySchema,
        exits: [{ outcome: 'ok', outputSchema: emptySchema }],
        nodes: [
          {
            kind: 'script',
            id: 'echo',
            requirementKey: 'echo',
            script: { id: 'script:system/echo', version: 1 },
            input: { message: { kind: 'literal', value: 'hello-cri' } },
            inputSchema: {
              type: 'object',
              properties: { message: { type: 'string', enum: ['hello-cri'] } },
              required: ['message'],
              additionalProperties: false,
            },
            outputSchema: {
              type: 'object',
              properties: { message: { type: 'string', enum: ['hello-cri'] } },
              required: ['message'],
              additionalProperties: false,
            },
            routes: { succeeded: 'done', failed: 'done', cancelled: 'done' },
          },
          { kind: 'end', id: 'done', outcome: 'ok', output: {} },
        ],
      },
    },
  ],
});

export const gitStatusPipeline = (): PipelineSourcePackage => {
  const pipeline = echoPipeline();
  const [entryModule, ...remainingModules] = pipeline.modules;
  const [, terminalNode] = entryModule.region.nodes;

  if (terminalNode === undefined) {
    throw new Error('Git status fixture terminal node is missing.');
  }

  return {
    ...pipeline,
    key: 'core-git-status',
    modules: [
      {
        ...entryModule,
        region: {
          ...entryModule.region,
          entry: 'status',
          nodes: [
            {
              kind: 'script',
              id: 'status',
              requirementKey: 'status',
              script: { id: 'script:git/status', version: 1 },
              input: {
                resource: { kind: 'literal', value: 'repository' },
                baseCapture: { kind: 'literal', value: `git-commit:${'1'.repeat(40)}` },
                headCapture: { kind: 'literal', value: `git-tree:${'2'.repeat(40)}` },
              },
              inputSchema: {
                type: 'object',
                properties: {
                  resource: { type: 'string', enum: ['repository'] },
                  baseCapture: { type: 'string', enum: [`git-commit:${'1'.repeat(40)}`] },
                  headCapture: { type: 'string', enum: [`git-tree:${'2'.repeat(40)}`] },
                },
                required: ['resource', 'baseCapture', 'headCapture'],
                additionalProperties: false,
              },
              outputSchema: {
                type: 'object',
                properties: {
                  schemaVersion: { type: 'string', enum: ['workspace-change/v1'] },
                  baseCapture: { type: 'string' },
                  headCapture: { type: 'string' },
                  changedPaths: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        path: { type: 'string' },
                        status: {
                          type: 'string',
                          enum: ['added', 'modified', 'deleted', 'renamed', 'untracked'],
                        },
                      },
                      required: ['path', 'status'],
                      additionalProperties: false,
                    },
                  },
                  clean: { type: 'boolean' },
                },
                required: ['schemaVersion', 'baseCapture', 'headCapture', 'changedPaths', 'clean'],
                additionalProperties: false,
              },
              routes: { succeeded: 'done', failed: 'done', cancelled: 'done' },
            },
            terminalNode,
          ],
        },
      },
      ...remainingModules,
    ],
  };
};

export const gitStatusProfile = (): RunProfile => ({
  ...taskProfile(),
  bindings: {
    agents: {},
    scripts: {
      status: {
        resources: {
          repository: {
            resourceRef: 'unavailable-resource',
            workspaceRef: 'unavailable-workspace',
          },
        },
        credentials: {},
      },
    },
  },
});
