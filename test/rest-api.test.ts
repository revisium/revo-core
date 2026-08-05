import { readFile } from 'node:fs/promises';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import packageJson from '../package.json' with { type: 'json' };
import { initSwagger } from '../src/api/rest/swagger.js';
import { AppModule } from '../src/app.module.js';
import { invalidPipeline, taskPipeline } from './fixtures/task-pipeline.js';

describe('REST API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    initSwagger(app);
    await app.init();
  });

  afterAll(async () => app.close());

  test('returns system information through CQRS', async () => {
    const response = await request(app.getHttpServer()).get('/api/system').expect(200);

    expect(response.body).toEqual({ name: 'revo-core', status: 'ok' });
  });

  test('starts and reads a durable run', async () => {
    const pipeline = taskPipeline();
    const input = { transport: 'rest' };
    const started = await request(app.getHttpServer())
      .post('/api/runs')
      .send({ pipeline, input })
      .expect(201);

    expect(started.body.runId).toEqual(expect.any(String));

    const runId = started.body.runId as string;
    let snapshot: Record<string, unknown> | undefined;

    await expect
      .poll(async () => {
        const response = await request(app.getHttpServer()).get(`/api/runs/${runId}`).expect(200);
        snapshot = response.body as Record<string, unknown>;
        return snapshot.status;
      })
      .toBe('succeeded');

    expect(snapshot).toMatchObject({ id: runId, input });
  });

  test('returns not found for an unknown run', async () => {
    const response = await request(app.getHttpServer()).get('/api/runs/missing-run');

    expect(response.status).toBe(404);
  });

  test('rejects an invalid pipeline', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/runs')
      .send({ pipeline: invalidPipeline(), input: null })
      .expect(400);

    expect(response.body).toMatchObject({ message: 'Pipeline definition is invalid.' });
  });

  test('matches the committed OpenAPI document', async () => {
    const response = await request(app.getHttpServer()).get('/api-json').expect(200);
    const expected = JSON.parse(
      await readFile(new URL('../src/api/rest/openapi.json', import.meta.url), 'utf8'),
    );

    expect(response.body).toEqual(expected);
    expect(response.body.info.version).toBe(packageJson.version);
  });
});
