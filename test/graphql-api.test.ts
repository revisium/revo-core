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
