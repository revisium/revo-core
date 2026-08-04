import { readFile } from 'node:fs/promises';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import packageJson from '../package.json' with { type: 'json' };
import { initSwagger } from '../src/api/rest/swagger.js';
import { AppModule } from '../src/app.module.js';

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

  test('matches the committed OpenAPI document', async () => {
    const response = await request(app.getHttpServer()).get('/api-json').expect(200);
    const expected = JSON.parse(
      await readFile(new URL('../src/api/rest/openapi.json', import.meta.url), 'utf8'),
    );

    expect(response.body).toEqual(expected);
    expect(response.body.info.version).toBe(packageJson.version);
  });
});
