import { readFile } from 'node:fs/promises';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
  type IntrospectionQuery,
} from 'graphql';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { taskPipeline } from './fixtures/task-pipeline.js';

describe('GraphQL API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  test('returns system information through CQRS', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: 'query { systemInfo { name status } }' })
      .expect(200);

    expect(response.body).toEqual({
      data: { systemInfo: { name: 'revo-core', status: 'ok' } },
    });
  });

  test('starts and reads a durable run', async () => {
    const pipeline = taskPipeline();
    const input = { transport: 'graphql' };
    const started = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation StartRun($data: StartRunInput!) {
            startRun(data: $data) { runId }
          }
        `,
        variables: { data: { pipeline, input } },
      })
      .expect(200);

    expect(started.body.errors).toBeUndefined();
    const runId = started.body.data.startRun.runId as string;
    let snapshot: Record<string, unknown> | undefined;

    await expect
      .poll(async () => {
        const response = await request(app.getHttpServer())
          .post('/graphql')
          .send({
            query: `
              query Run($id: ID!) {
                run(id: $id) { id status executionPlan input }
              }
            `,
            variables: { id: runId },
          })
          .expect(200);
        snapshot = response.body.data.run as Record<string, unknown>;
        return snapshot.status;
      })
      .toBe('succeeded');

    expect(snapshot).toMatchObject({ id: runId, status: 'succeeded', input });
  });

  test('returns null for an unknown run', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: 'query { run(id: "missing-run") { id } }' })
      .expect(200);

    expect(response.body).toEqual({ data: { run: null } });
  });

  test('matches the committed schema', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: getIntrospectionQuery() })
      .expect(200);
    const actual = printSchema(buildClientSchema(response.body.data as IntrospectionQuery)).trim();
    const expected = (
      await readFile(new URL('../src/api/graphql/schema.graphql', import.meta.url), 'utf8')
    ).trim();

    expect(actual).toBe(expected);
  });
});
