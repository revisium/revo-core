import { YogaDriver } from '@graphql-yoga/nestjs';
import { Controller, Get, Query, type INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule, Query as GraphqlQuery, Resolver } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PublicErrorExceptionFilter } from '../src/api/errors/public-error-exception.filter.js';
import { ApplicationError } from '../src/application/errors/application-error.js';

let fault: unknown;

@Controller('public-error-probe')
@Resolver()
class PublicErrorProbeController {
  @Get()
  restFail(@Query('mode') mode?: string): never {
    if (mode === 'object') {
      throw { statusCode: 418, code: 'run_not_found', message: 'secret object' };
    }
    throw fault;
  }
  @GraphqlQuery(() => String)
  fail(): never {
    throw fault;
  }
}

describe('public application errors at mixed transports', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLModule.forRoot({ driver: YogaDriver, autoSchemaFile: true })],
      controllers: [PublicErrorProbeController],
      providers: [
        PublicErrorProbeController,
        { provide: APP_FILTER, useClass: PublicErrorExceptionFilter },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => app.close());

  it.each([
    {
      code: 'PROJECT_NOT_FOUND',
      details: {},
      statusCode: 404,
      rest: { statusCode: 404, error: 'Not Found', message: 'Project was not found.' },
      graphql: { statusCode: 404, message: 'Project was not found.' },
    },
    {
      code: 'PROJECT_HAS_ACTIVE_RUNS',
      details: { runIds: ['run-1'] },
      statusCode: 409,
      rest: {
        statusCode: 409,
        code: 'project_has_active_runs',
        message: 'Project has active runs.',
        description: 'Stop or finish the active runs before archiving the project.',
        path: '/projectId',
        details: { runIds: ['run-1'] },
      },
      graphql: {
        statusCode: 409,
        code: 'project_has_active_runs',
        message: 'Project has active runs.',
        description: 'Stop or finish the active runs before archiving the project.',
        path: '/projectId',
        details: { runIds: ['run-1'] },
      },
    },
    {
      code: 'WORKSPACE_INVALID_INPUT',
      details: { field: 'sourcePath', secret: 'hidden' },
      statusCode: 400,
      rest: {
        statusCode: 400,
        code: 'WORKSPACE_INVALID_INPUT',
        message: 'Workspace input is invalid.',
        field: 'sourcePath',
      },
      graphql: {
        statusCode: 400,
        code: 'WORKSPACE_INVALID_INPUT',
        message: 'Workspace input is invalid.',
        field: 'sourcePath',
      },
    },
    {
      code: 'FILE_SYSTEM_IO_ERROR',
      details: { path: '/secret', cause: { token: 'hidden' } },
      statusCode: 500,
      rest: {
        statusCode: 500,
        code: 'FILE_SYSTEM_IO_ERROR',
        message: 'Filesystem operation failed.',
      },
      graphql: {
        statusCode: 500,
        code: 'FILE_SYSTEM_IO_ERROR',
        message: 'Filesystem operation failed.',
      },
    },
    {
      code: 'REVO_AGENT_SESSION_INVALID_CURSOR',
      details: {},
      statusCode: 400,
      rest: {
        statusCode: 400,
        code: 'REVO_AGENT_SESSION_INVALID_CURSOR',
        message: 'Agent definition cursor is invalid.',
      },
      graphql: {
        statusCode: 400,
        code: 'REVO_AGENT_SESSION_INVALID_CURSOR',
        message: 'Agent definition cursor is invalid.',
        path: null,
        details: {},
      },
    },
    {
      code: 'run_selector_invalid',
      details: { selector: 'profile', reason: 'conflict' },
      statusCode: 400,
      rest: {
        statusCode: 400,
        code: 'run_selector_invalid',
        message: 'Exactly one profile selector is required.',
        path: '/profile',
        details: { reason: 'conflict' },
      },
      graphql: {
        statusCode: 400,
        code: 'run_selector_invalid',
        message: 'Exactly one profile selector is required.',
        path: '/profile',
        details: { reason: 'conflict' },
      },
    },
    {
      code: 'run_not_found',
      details: { runId: 'run-1', path: '', secret: { value: 'hidden' } },
      statusCode: 404,
      rest: {
        statusCode: 404,
        code: 'run_not_found',
        message: 'Run was not found.',
        path: '',
        details: { runId: 'run-1' },
      },
      graphql: {
        statusCode: 404,
        code: 'run_not_found',
        message: 'Run was not found.',
        path: '',
        details: { runId: 'run-1' },
      },
    },
  ] as const)('%s keeps explicit REST and Yoga envelopes', async (vector) => {
    fault = new ApplicationError(vector.code, vector.details);
    const rest = await request(app.getHttpServer())
      .get('/public-error-probe')
      .expect(vector.statusCode);
    expect(rest.body).toEqual(vector.rest);

    const graphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ fail }' })
      .expect(200);
    expect(graphql.body.data).toBeNull();
    expect(graphql.body.errors[0].extensions).toEqual(vector.graphql);
  });

  it('masks unknown codes, unknown objects, and internal errors', async () => {
    fault = new ApplicationError('unknown_code', { secret: 'hidden' });
    await expect(request(app.getHttpServer()).get('/public-error-probe')).resolves.toMatchObject({
      status: 500,
      body: { statusCode: 500, message: 'Internal server error.' },
    });
    fault = new Error('secret error');
    const graphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ fail }' })
      .expect(200);
    expect(graphql.body.errors[0]).toMatchObject({
      message: 'Internal server error.',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
    const object = await request(app.getHttpServer())
      .get('/public-error-probe?mode=object')
      .expect(500);
    expect(object.body).toEqual({ statusCode: 500, message: 'Internal server error.' });
  });
});
