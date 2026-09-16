import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  type INestApplication,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { GraphQLError } from 'graphql';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import {
  maskGraphqlError,
  PublicHttpExceptionFilter,
} from '../src/api/graphql/public-http-exception.filter.js';
import { HttpBadRequestExceptionFilter } from '../src/api/rest/http-bad-request-exception.filter.js';
import {
  AgentDefinitionsApplicationError,
  AgentDefinitionsErrorCode,
} from '../src/features/agent-definitions/contracts/agent-definitions.errors.js';
import { FileSystemError } from '../src/features/file-system/contracts/file-system.error.js';
import { ProjectHasActiveRunsError } from '../src/features/project/contracts/project.errors.js';
import { RunPublicError } from '../src/features/run/contracts/run.errors.js';
import { WorkspaceError } from '../src/features/workspace/contracts/workspace.errors.js';
import { publicErrorState } from './fixtures/public-error-state.js';
import { ErrorController } from './fixtures/public-error.controller.js';
import { ErrorResolver } from './fixtures/public-error.resolver.js';

describe('Public error boundaries', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<YogaDriverConfig>({
          driver: YogaDriver,
          autoSchemaFile: true,
          maskedErrors: { isDev: false, maskError: maskGraphqlError },
        }),
      ],
      controllers: [ErrorController],
      providers: [ErrorResolver, { provide: APP_FILTER, useClass: HttpBadRequestExceptionFilter }],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => app.close());

  test.each([
    [
      new ProjectHasActiveRunsError(['run-1']),
      {
        statusCode: 409,
        code: 'project_has_active_runs',
        message: 'Project has active runs.',
        path: '/projectId',
        details: { runIds: ['run-1'] },
      },
    ],
    [
      new RunPublicError(503, 'manager_not_started', 'Manager is unavailable.', '', {
        nested: { supported: [null, 'value'] },
      }),
      {
        statusCode: 503,
        code: 'manager_not_started',
        message: 'Manager is unavailable.',
        path: '',
        details: { nested: { supported: [null, 'value'] } },
      },
    ],
  ])('preserves full envelopes and partial GraphQL data', async (error, body) => {
    publicErrorState.failure = error;
    const rest = await request(app.getHttpServer()).get('/error-probe').expect(body.statusCode);
    expect(rest.body).toEqual(body);
    const gql = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ healthyProbe errorProbe }' })
      .expect(200);
    expect(gql.body.data).toEqual({ healthyProbe: 'ok', errorProbe: null });
    expect(gql.body.errors).toEqual([
      {
        message: body.message,
        locations: [{ line: 1, column: 16 }],
        path: ['errorProbe'],
        extensions: body,
      },
    ]);
  });

  test.each([
    [
      new WorkspaceError('WORKSPACE_INVALID_INPUT', 'name'),
      { statusCode: 400, code: 'WORKSPACE_INVALID_INPUT', field: 'name' },
    ],
    [
      new FileSystemError('FILE_SYSTEM_IO_ERROR'),
      { statusCode: 500, code: 'FILE_SYSTEM_IO_ERROR' },
    ],
    [
      new AgentDefinitionsApplicationError(AgentDefinitionsErrorCode.invalidCursor),
      { statusCode: 400, code: 'REVO_AGENT_SESSION_INVALID_CURSOR', path: null },
    ],
  ])(
    'keeps minimal extensions without duplicated message or details',
    async (error, extensions) => {
      publicErrorState.failure = error;
      const rest = await request(app.getHttpServer())
        .get('/error-probe')
        .expect(extensions.statusCode);
      expect(rest.body).toEqual({ ...extensions, message: error.message });
      const gql = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: '{ errorProbe }' })
        .expect(200);
      expect(gql.body.errors[0].extensions).toEqual(extensions);
      expect(gql.body.errors[0].message).toBe(error.message);
    },
  );

  test('keeps original unknown REST failures in private Nest diagnostics', async () => {
    const original = new Error('private implementation detail');
    const logging = vi.spyOn(Logger.prototype, 'error');

    try {
      publicErrorState.failure = original;
      const response = await request(app.getHttpServer()).get('/error-probe').expect(500);
      expect(response.body).toEqual({ statusCode: 500, message: 'Internal server error' });
      expect(logging).toHaveBeenCalledWith(original);
    } finally {
      logging.mockRestore();
    }
  });

  test.each([
    new Error('secret'),
    new TypeError('secret'),
    new InternalServerErrorException('secret'),
    new HttpException(
      { message: 'secret', code: 'PUBLIC_LOOKING', details: { token: 'secret' } },
      400,
    ),
    { statusCode: 400, message: 'secret', code: 'PUBLIC_LOOKING' },
    new GraphQLError('secret', { extensions: { code: 'BAD_USER_INPUT', token: 'secret' } }),
    new GraphQLError('secret wrapper', {
      originalError: new Error('secret cause'),
      extensions: { code: 'BAD_USER_INPUT' },
    }),
  ])('masks unrecognized exceptions across both transports', async (error) => {
    publicErrorState.failure = error;
    const rest = await request(app.getHttpServer()).get('/error-probe').expect(500);
    expect(rest.body).toEqual({ statusCode: 500, message: 'Internal server error' });
    const gql = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ errorProbe }' })
      .expect(200);
    expect(gql.body.errors[0]).toMatchObject({
      message: 'Unexpected error.',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
      path: ['errorProbe'],
    });
    expect(JSON.stringify(gql.body)).not.toContain('secret');
  });

  test.each([
    new BadRequestException('Input is invalid.'),
    new NotFoundException('Project was not found.'),
    new ConflictException('Project is not active.'),
  ])('preserves intentional native client messages', async (error) => {
    publicErrorState.failure = error;
    await request(app.getHttpServer()).get('/error-probe').expect(error.getStatus());
    const gql = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ errorProbe }' })
      .expect(200);
    expect(gql.body.errors[0].message).toBe(error.message);
    expect(gql.body.errors[0].extensions).toBeUndefined();
  });

  test.each([
    { query: '{', fragment: 'Syntax Error', status: 200 },
    { query: '{ missingField }', fragment: 'Cannot query field', status: 200 },
    {
      query: 'query($value: Int!) { integerProbe(value: $value) }',
      variables: { value: 'invalid' },
      fragment: 'Int cannot represent',
      status: 400,
    },
  ])(
    'retains engine parse, validation and variable coercion errors',
    async ({ fragment, status, ...body }) => {
      const result = await request(app.getHttpServer()).post('/graphql').send(body).expect(status);
      expect(result.body.errors[0].message).toContain(fragment);
      expect(result.body.data).toBeUndefined();
    },
  );

  test('keeps malformed JSON and native pipe validation as client errors', async () => {
    const malformed = await request(app.getHttpServer())
      .post('/error-probe')
      .type('json')
      .send('{')
      .expect(400);
    expect(malformed.body.code).toBe('INVALID_REQUEST');
    const pipe = await request(app.getHttpServer()).get('/error-probe/not-an-integer').expect(400);
    expect(pipe.body).toMatchObject({
      code: 'INVALID_REQUEST',
      message: 'Validation failed (numeric string is expected)',
    });
  });
});

test('public feature payloads detach caller-owned nested values', () => {
  const runIds = ['one'];
  const project = new ProjectHasActiveRunsError(runIds);
  runIds.push('two');
  expect(project.publicResponse.details).toEqual({ runIds: ['one'] });
  const diagnostic = { supportedExtra: { value: 'before' } };
  const details = { diagnostics: [diagnostic] };
  const run = new RunPublicError(422, 'run_profile_invalid', 'Invalid profile.', null, details);
  diagnostic.supportedExtra.value = 'after';
  expect(run.publicResponse.details).toEqual({
    diagnostics: [{ supportedExtra: { value: 'before' } }],
  });
});

test('wrapper extensions cannot replace prepared public fields', () => {
  const prepared = new PublicHttpExceptionFilter().catch(new WorkspaceError('WORKSPACE_NOT_FOUND'));
  const wrapped = new GraphQLError('secret', {
    path: ['errorProbe'],
    originalError: prepared,
    extensions: { token: 'secret' },
  });
  expect(maskGraphqlError(wrapped).toJSON()).toEqual({
    message: 'Workspace was not found in this Project.',
    path: ['errorProbe'],
    extensions: { code: 'WORKSPACE_NOT_FOUND', statusCode: 404 },
  });
});

test('cyclic originalError chains terminate with a safe result', () => {
  const error = new GraphQLError('secret', { path: ['errorProbe'] });
  Object.defineProperty(error, 'originalError', { value: error });
  expect(maskGraphqlError(error).message).toBe('Unexpected error.');
});
