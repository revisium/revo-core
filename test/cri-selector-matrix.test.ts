import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EngineApiService } from '@revisium/engine';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { CatalogDraftService } from '../src/features/playbook-catalog/catalog-draft.service.js';
import { CatalogTable } from '../src/features/playbook-catalog/constants/catalog.constants.js';
import { PlaybookCatalogApiService } from '../src/features/playbook-catalog/playbook-catalog-api.service.js';
import { taskPipeline, taskProfile } from './fixtures/task-pipeline.js';

// oxlint-disable eslint/no-await-in-loop -- Transport cases intentionally execute serially on DBOS.

const PIPELINE_ID = 'cri-terminal-pipeline';
const PROFILE_ID = 'cri-terminal-profile';

describe('CRI selector matrix', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await startApp();
    const engine = app.get(EngineApiService);
    const drafts = app.get(CatalogDraftService);
    const catalog = app.get(PlaybookCatalogApiService);
    const revisionId = await drafts.getDraftRevisionId();

    await engine.createRow({
      revisionId,
      tableId: CatalogTable.pipelines,
      rowId: PIPELINE_ID,
      data: {
        playbookId: 'revo',
        pipeline: JSON.stringify(taskPipeline()),
      },
    });
    await engine.createRow({
      revisionId,
      tableId: CatalogTable.launchProfiles,
      rowId: PROFILE_ID,
      data: {
        pipelineId: PIPELINE_ID,
        status: 'active',
        profile: JSON.stringify(taskProfile()),
      },
    });
    await catalog.commitCatalog('CRI selector matrix fixtures');
  });

  afterAll(async () => app?.close());

  test('completes four selector combinations through REST and GraphQL and survives restart', async () => {
    const pipeline = taskPipeline();
    const profile = taskProfile();
    const selectors = [
      { pipeline, profile },
      { pipelineId: PIPELINE_ID, profileId: PROFILE_ID },
      { pipelineId: PIPELINE_ID, profile },
      { pipeline, profileId: PROFILE_ID },
    ];
    const runIds: string[] = [];

    for (const selector of selectors) {
      const started = await request(app.getHttpServer())
        .post('/api/runs')
        .send({ ...selector, input: {} })
        .expect(201);
      const runId = started.body.runId as string;
      runIds.push(runId);
      await expect.poll(() => restStatus(app, runId)).toBe('succeeded');
    }

    for (const selector of selectors) {
      const started = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: 'mutation($data: StartRunInput!) { startRun(data: $data) { runId } }',
          variables: { data: { ...selector, input: {} } },
        })
        .expect(200);
      expect(started.body.errors).toBeUndefined();
      const runId = started.body.data.startRun.runId as string;
      runIds.push(runId);
      await expect.poll(() => graphqlStatus(app, runId)).toBe('succeeded');
    }

    expect(new Set(runIds).size).toBe(8);
    await app.close();
    app = await startApp();
    const [firstRunId] = runIds;
    if (firstRunId === undefined) {
      throw new Error('Selector matrix did not create a run.');
    }
    await expect.poll(() => restStatus(app, firstRunId)).toBe('succeeded');
  }, 15_000);

  test('rejects selector conflicts, absence, null, empty, invalid bodies, and catalog failures', async () => {
    const pipeline = taskPipeline();
    const profile = taskProfile();
    const invalidInputs = [
      { pipelineId: PIPELINE_ID, pipeline, profile },
      { profile },
      { pipelineId: null, profile },
      { pipelineId: '', profile },
      { pipelineId: 'missing-pipeline', profile },
      { pipeline: { schemaVersion: 'pipeline-source/v1' }, profile },
      { pipeline: JSON.stringify(pipeline), profile },
      { pipeline, profileId: PROFILE_ID, profile },
      { pipeline },
      { pipeline, profileId: null },
      { pipeline, profileId: '' },
      { pipeline, profileId: 'missing-profile' },
      { pipeline, profile: { schemaVersion: 'run-profile/v1' } },
      { pipeline, profile: JSON.stringify(profile) },
    ];

    for (const input of invalidInputs) {
      const rest = await request(app.getHttpServer())
        .post('/api/runs')
        .send({ ...input, input: {} });
      expect(rest.status).toBeGreaterThanOrEqual(400);
      expect(rest.status).toBeLessThan(500);

      const graphql = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: 'mutation($data: StartRunInput!) { startRun(data: $data) { runId } }',
          variables: { data: { ...input, input: {} } },
        });
      expect(graphql.status).toBe(200);
      expect(graphql.body.errors).toBeDefined();
    }
  });
});

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

async function restStatus(app: INestApplication, runId: string): Promise<string> {
  const response = await request(app.getHttpServer()).get(`/api/runs/${runId}`).expect(200);
  return response.body.status as string;
}

async function graphqlStatus(app: INestApplication, runId: string): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/graphql')
    .send({
      query: 'query($id: ID!) { run(id: $id) { status } }',
      variables: { id: runId },
    })
    .expect(200);
  expect(response.body.errors).toBeUndefined();
  return response.body.data.run.status as string;
}
