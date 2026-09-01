import { readFile } from 'node:fs/promises';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EngineApiService } from '@revisium/engine';
import { nanoid } from 'nanoid';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { CatalogTable } from '../src/features/playbook-catalog/contracts/catalog-table.js';
import { LaunchProfileStatus } from '../src/features/playbook-catalog/contracts/catalog.enums.js';
import { CatalogRevisionService } from '../src/features/playbook-catalog/engine/catalog-revision.service.js';
import { PlaybookCatalogApiService } from '../src/features/playbook-catalog/playbook-catalog-api.service.js';
import { RevoRunService } from '../src/features/run/revo-run.service.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import {
  brokenPipeline,
  echoPipeline,
  gitStatusPipeline,
  gitStatusProfile,
  singleAgentPipeline,
  singleAgentProfile,
  taskPipeline,
  taskProfile,
} from './fixtures/task-pipeline.js';

type PublicError = {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
  readonly path: string | null;
  readonly details: Record<string, unknown>;
};

describe('CRI public run contract', () => {
  let app: INestApplication;
  let catalog: PlaybookCatalogApiService;
  let engine: EngineApiService;
  let drafts: CatalogRevisionService;

  beforeAll(async () => {
    app = await startApp();
    catalog = app.get(PlaybookCatalogApiService);
    engine = app.get(EngineApiService);
    drafts = app.get(CatalogRevisionService);
  });

  afterAll(async () => app?.close());

  test('generates exact OpenAPI XOR selectors and GraphQL selector scalar types', async () => {
    const openapi: unknown = JSON.parse(
      await readFile(new URL('../src/api/rest/openapi.json', import.meta.url), 'utf8'),
    );
    const components = recordProperty(openapi, 'components');
    const schemas = recordProperty(components, 'schemas');
    const startRunRequest = recordProperty(schemas, 'StartRunRequest');
    const properties = recordProperty(startRunRequest, 'properties');
    expect(properties.pipelineId).toEqual({
      type: 'string',
      minLength: 1,
      maxLength: 64,
      pattern: '^[A-Za-z0-9_-]{1,64}$',
    });
    expect(properties.profileId).toEqual(properties.pipelineId);
    expect(properties.pipeline).toEqual({
      type: 'object',
      additionalProperties: true,
    });
    expect(properties.profile).toEqual(properties.pipeline);
    const pipelineResponse = recordProperty(schemas, 'PipelineResponse');
    const pipelineProperties = recordProperty(pipelineResponse, 'properties');
    expect(pipelineProperties).not.toHaveProperty('launchability');
    expect(Object.keys(pipelineProperties).toSorted()).toEqual(
      ['id', 'isHead', 'pipeline', 'playbookId', 'revisionId'].toSorted(),
    );
    const runResponse = recordProperty(schemas, 'RunResponse');
    const runProperties = recordProperty(runResponse, 'properties');
    expect(runProperties.terminal).toEqual({
      type: 'object',
      additionalProperties: true,
      nullable: true,
    });
    expect(runResponse.required).toEqual(
      expect.arrayContaining([
        'schemaVersion',
        'runId',
        'status',
        'terminal',
        'createdAt',
        'updatedAt',
      ]),
    );
    const paths = recordProperty(openapi, 'paths');
    const runs = recordProperty(paths, '/api/runs');
    const post = recordProperty(runs, 'post');
    const requestBody = recordProperty(post, 'requestBody');
    const content = recordProperty(requestBody, 'content');
    const json = recordProperty(content, 'application/json');
    expect(json.schema).toEqual({
      allOf: [
        { $ref: '#/components/schemas/StartRunRequest' },
        {
          oneOf: [
            { required: ['pipelineId'], not: { required: ['pipeline'] } },
            { required: ['pipeline'], not: { required: ['pipelineId'] } },
          ],
        },
        {
          oneOf: [
            { required: ['profileId'], not: { required: ['profile'] } },
            { required: ['profile'], not: { required: ['profileId'] } },
          ],
        },
      ],
    });

    const graphql = await readFile(
      new URL('../src/api/graphql/schema.graphql', import.meta.url),
      'utf8',
    );
    expect(graphql).toContain(
      'input StartRunInput {\n  input: JSON!\n  pipeline: JSON\n  pipelineId: ID\n  profile: JSON\n  profileId: ID\n}',
    );
    expect(graphql).toContain(
      'type RunModel {\n  createdAt: String!\n  runId: ID!\n  schemaVersion: String!\n  status: String!\n  terminal: JSON\n  updatedAt: String!\n}',
    );
    expect(graphql).toContain('input PipelineInput {\n  id: ID!\n  pipeline: JSON!');
    expect(graphql).toContain(
      'type PipelineModel {\n  id: ID!\n  isHead: Boolean!\n  pipeline: JSON!',
    );
    expect(graphql).toContain(
      'input LaunchProfileInput {\n  id: ID!\n  pipelineId: ID!\n  profile: JSON!',
    );
    expect(graphql).toContain(
      'type LaunchProfileModel {\n  id: ID!\n  isHead: Boolean!\n  pipelineId: ID!\n  profile: JSON!',
    );
    expect(graphql).not.toContain('launchability');
  });

  test('round-trips catalog pipeline and profile objects through REST and GraphQL', async () => {
    const suffix = nanoid();
    const pipelineId = `contract-pipeline-${suffix}`;
    const profileId = `contract-profile-${suffix}`;
    const pipeline = taskPipeline();
    const profile = taskProfile();

    try {
      const createdPipeline = await request(app.getHttpServer())
        .post('/api/playbook-catalog/pipelines')
        .send({ id: pipelineId, playbookId: 'revo', pipeline })
        .expect(201);
      expect(createdPipeline.body.pipeline).toEqual(pipeline);

      const createdProfile = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query:
            'mutation($data: LaunchProfileInput!) { createLaunchProfile(data: $data) { id profile } }',
          variables: { data: { id: profileId, pipelineId, status: 'active', profile } },
        })
        .expect(200);
      expect(createdProfile.body.errors).toBeUndefined();
      expect(createdProfile.body.data.createLaunchProfile).toEqual({ id: profileId, profile });

      const readPipeline = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: 'query($id: ID!) { pipeline(id: $id, scope: DRAFT) { id pipeline } }',
          variables: { id: pipelineId },
        })
        .expect(200);
      expect(readPipeline.body.errors).toBeUndefined();
      expect(readPipeline.body.data.pipeline).toEqual({ id: pipelineId, pipeline });

      const readProfile = await request(app.getHttpServer())
        .get(`/api/playbook-catalog/launch-profiles/${profileId}`)
        .query({ scope: 'DRAFT' })
        .expect(200);
      expect(readProfile.body.profile).toEqual(profile);
    } finally {
      await catalog.discardCatalog();
    }
  });

  test('rejects conflicts before null validation with exact REST and GraphQL parity', async () => {
    expect.hasAssertions();
    await expectPublicError(
      app,
      {
        pipelineId: null,
        pipeline: null,
        profile: taskProfile(),
        input: {},
      },
      {
        statusCode: 400,
        code: 'run_selector_invalid',
        message: 'Exactly one pipeline selector is required.',
        path: '/pipeline',
        details: { reason: 'conflict' },
      },
    );
  });

  test('returns exact REST and GraphQL parity for the selector negative matrix', async () => {
    expect.hasAssertions();
    const pipelineId = `cri-golden-pipeline-${nanoid()}`;
    const profileId = `cri-golden-profile-${nanoid()}`;
    await catalog.createPipeline({
      id: pipelineId,
      playbookId: 'revo',
      pipeline: taskPipeline(),
    });
    await catalog.createLaunchProfile({
      id: profileId,
      pipelineId,
      status: LaunchProfileStatus.active,
      profile: taskProfile(),
    });
    await catalog.commitCatalog('CRI exact selector errors');

    const pipeline = taskPipeline();
    const profile = taskProfile();
    const cases: readonly {
      readonly label: string;
      readonly input: Record<string, unknown>;
      readonly expected: PublicError;
    }[] = [
      selectorCase(
        'pipeline-both',
        { pipelineId, pipeline, profile, input: {} },
        'pipeline',
        'conflict',
      ),
      selectorCase('pipeline-neither', { profile, input: {} }, 'pipeline', 'required'),
      selectorCase(
        'pipeline-null',
        { pipelineId: null, profile, input: {} },
        'pipeline',
        'invalid_id',
      ),
      selectorCase(
        'pipeline-empty',
        { pipelineId: '', profile, input: {} },
        'pipeline',
        'invalid_id',
      ),
      selectorCase(
        'pipeline-number',
        { pipelineId: 1e21, profile, input: {} },
        'pipeline',
        'invalid_id',
      ),
      selectorCase(
        'pipeline-invalid-string',
        { pipelineId: 'invalid.pipeline', profile, input: {} },
        'pipeline',
        'invalid_id',
      ),
      {
        label: 'pipeline-stringified-document',
        input: { pipeline: JSON.stringify(pipeline), profile, input: {} },
        expected: invalidEnvelope(),
      },
      selectorCase(
        'profile-both',
        { pipeline, profileId, profile, input: {} },
        'profile',
        'conflict',
      ),
      selectorCase('profile-neither', { pipeline, input: {} }, 'profile', 'required'),
      selectorCase(
        'profile-null',
        { pipeline, profileId: null, input: {} },
        'profile',
        'invalid_id',
      ),
      selectorCase(
        'profile-empty',
        { pipeline, profileId: '', input: {} },
        'profile',
        'invalid_id',
      ),
      selectorCase(
        'profile-number',
        { pipeline, profileId: 1e21, input: {} },
        'profile',
        'invalid_id',
      ),
      selectorCase(
        'profile-invalid-string',
        { pipeline, profileId: 'invalid.profile', input: {} },
        'profile',
        'invalid_id',
      ),
      {
        label: 'profile-invalid-document',
        input: { pipeline, profile: { schemaVersion: 'run-profile/v1' }, input: {} },
        expected: invalidEnvelope(),
      },
      {
        label: 'profile-stringified-document',
        input: { pipeline, profile: JSON.stringify(profile), input: {} },
        expected: invalidEnvelope(),
      },
    ];

    for (const item of cases) {
      // oxlint-disable-next-line no-await-in-loop -- Exact transport parity is asserted case by case.
      await expectPublicError(app, item.input, item.expected, item.label);
    }
  });

  test('maps real compilation, profile, and requirement admission failures to 422', async () => {
    await expectPublicError(
      app,
      { pipeline: brokenPipeline(), profile: taskProfile(), input: {} },
      {
        statusCode: 422,
        code: 'pipeline_compilation_failed',
        message: 'Pipeline compilation failed.',
        path: null,
        details: expect.any(Object) as Record<string, unknown>,
      },
    );
    await expectPublicError(
      app,
      {
        pipeline: taskPipeline(),
        profile: {
          ...taskProfile(),
          bindings: {
            agents: {},
            scripts: { extra: { resources: {}, credentials: {} } },
          },
        },
        input: {},
      },
      {
        statusCode: 422,
        code: 'run_profile_invalid',
        message: 'Run profile is invalid.',
        path: '/bindings/scripts',
        details: { reason: 'extra_assignment' },
      },
    );
    await expectPublicError(
      app,
      { pipeline: echoPipeline(), profile: taskProfile(), input: {} },
      {
        statusCode: 422,
        code: 'run_requirement_unresolved',
        message: 'A run requirement could not be resolved.',
        path: null,
        details: {
          requirementKey: 'echo',
          bindingKey: null,
          reason: 'missing_script_assignment',
        },
      },
    );
  });

  test('fails closed through both APIs for agent and unavailable resource admission', async () => {
    const workflowsBefore = await dbosWorkflowCount(app);
    await expectPublicError(
      app,
      { pipeline: singleAgentPipeline(), profile: singleAgentProfile(), input: {} },
      {
        statusCode: 503,
        code: 'agent_runtime_unavailable',
        message: 'Agent runtime is unavailable.',
        path: null,
        details: {},
      },
    );
    await expectPublicError(
      app,
      { pipeline: gitStatusPipeline(), profile: gitStatusProfile(), input: {} },
      {
        statusCode: 422,
        code: 'run_requirement_unresolved',
        message: 'A run requirement could not be resolved.',
        path: null,
        details: {
          requirementKey: 'status',
          bindingKey: null,
          reason: 'script_binding_unavailable',
        },
      },
    );
    expect(await dbosWorkflowCount(app)).toBe(workflowsBefore);
  });

  test('pipeline/profile performs zero catalog reads', async () => {
    const getPipeline = vi.spyOn(catalog, 'getPipeline');
    const getLaunchProfile = vi.spyOn(catalog, 'getLaunchProfile');

    await request(app.getHttpServer())
      .post('/api/runs')
      .send({ pipeline: taskPipeline(), profile: taskProfile(), input: {} })
      .expect(201);

    expect(getPipeline).not.toHaveBeenCalled();
    expect(getLaunchProfile).not.toHaveBeenCalled();
    getPipeline.mockRestore();
    getLaunchProfile.mockRestore();
  });

  test('lets ordinary catalog lookup errors flow from ID selectors', async () => {
    const rest = await request(app.getHttpServer())
      .post('/api/runs')
      .send({ pipelineId: 'missing-pipeline', profile: taskProfile(), input: {} })
      .expect(404);
    expect(rest.body).toEqual({
      message: 'Record unavailable',
      error: 'Not Found',
      statusCode: 404,
    });

    const graphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'mutation($data: StartRunInput!) { startRun(data: $data) { runId } }',
        variables: {
          data: { pipeline: taskPipeline(), profileId: 'missing-profile', input: {} },
        },
      })
      .expect(200);
    expect(graphql.body.data).toBeNull();
    expect(graphql.body.errors).toHaveLength(1);
  });

  test('maps malformed Catalog storage with parity before DBOS admission', async () => {
    const suffix = nanoid();
    const corruptPipelineId = `corrupt-pipeline-${suffix}`;
    const validPipelineId = `valid-pipeline-${suffix}`;
    const corruptProfileId = `corrupt-profile-${suffix}`;
    const revisionId = await drafts.getDraftRevisionId();
    const workflowsBefore = await dbosWorkflowCount(app);

    await engine.createRow({
      revisionId,
      tableId: CatalogTable.pipelines,
      rowId: corruptPipelineId,
      data: { playbookId: 'revo', pipeline: '{' },
    });
    await engine.createRow({
      revisionId,
      tableId: CatalogTable.pipelines,
      rowId: validPipelineId,
      data: { playbookId: 'revo', pipeline: JSON.stringify(taskPipeline()) },
    });
    await engine.createRow({
      revisionId,
      tableId: CatalogTable.launchProfiles,
      rowId: corruptProfileId,
      data: { pipelineId: validPipelineId, status: 'active', profile: '[]' },
    });
    await catalog.commitCatalog('CRI malformed Catalog storage');

    try {
      await expectPublicError(
        app,
        { pipelineId: corruptPipelineId, profile: taskProfile(), input: {} },
        corruptCatalogEnvelope('pipeline'),
      );
      await expectPublicError(
        app,
        { pipeline: taskPipeline(), profileId: corruptProfileId, input: {} },
        corruptCatalogEnvelope('profile'),
      );
      expect(await dbosWorkflowCount(app)).toBe(workflowsBefore);
    } finally {
      await catalog.deleteLaunchProfile(corruptProfileId);
      await catalog.deletePipeline(corruptPipelineId);
      await catalog.deletePipeline(validPipelineId);
      await catalog.commitCatalog('Remove CRI malformed Catalog storage');
    }
  });

  test('composes one RevoRun manager for both public transports', () => {
    expect(app.get(RevoRunService, { each: true })).toHaveLength(1);
  });
});

async function expectPublicError(
  app: INestApplication,
  input: Record<string, unknown>,
  expected: PublicError,
  _label?: string,
): Promise<void> {
  const rest = await request(app.getHttpServer())
    .post('/api/runs')
    .send(input)
    .expect(expected.statusCode);
  expect(rest.body).toEqual(expected);

  const graphql = await request(app.getHttpServer())
    .post('/graphql')
    .send({
      query: 'mutation($data: StartRunInput!) { startRun(data: $data) { runId } }',
      variables: { data: input },
    })
    .expect(200);
  expect(graphql.body.data).toBeNull();
  expect(graphql.body.errors).toHaveLength(1);
  expect(graphql.body.errors[0].extensions).toEqual(expected);
}

function recordProperty(value: unknown, key: string): Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value[key])) {
    throw new Error(`Expected OpenAPI object property ${key}.`);
  }

  return value[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function selectorCase(
  label: string,
  input: Record<string, unknown>,
  selector: 'pipeline' | 'profile',
  reason: 'conflict' | 'required' | 'invalid_id',
): {
  readonly label: string;
  readonly input: Record<string, unknown>;
  readonly expected: PublicError;
} {
  return {
    label,
    input,
    expected: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: `Exactly one ${selector} selector is required.`,
      path: `/${selector}`,
      details: { reason },
    },
  };
}

function invalidEnvelope(): PublicError {
  return {
    statusCode: 400,
    code: 'invalid_create_run_input',
    message: 'Create-run input is invalid.',
    path: '',
    details: { reason: 'invalid_envelope' },
  };
}

function corruptCatalogEnvelope(field: 'pipeline' | 'profile'): PublicError {
  return {
    statusCode: 409,
    code: 'catalog_definition_corrupt',
    message: 'Catalog definition is corrupt.',
    path: `/${field}`,
    details: { reason: 'storage_json' },
  };
}

async function startApp(): Promise<INestApplication> {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  try {
    await app.init();
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}

async function dbosWorkflowCount(app: INestApplication): Promise<number> {
  const rows = await app.get(PrismaService).$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*) AS count FROM dbos.workflow_status
  `;

  return Number(rows[0]?.count ?? 0n);
}
