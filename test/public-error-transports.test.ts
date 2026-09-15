import { YogaDriver } from '@graphql-yoga/nestjs';
import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  ParseIntPipe,
  Post,
  Query,
  type INestApplication,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule, Query as GraphqlQuery, Resolver } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { RunManagerError } from '@revisium/revo-run';
import { GraphQLError } from 'graphql';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PublicErrorExceptionFilter } from '../src/api/errors/public-error-exception.filter.js';
import { ApplicationGraphqlExceptionFilter } from '../src/api/graphql/application-graphql-exception.filter.js';
import { ApplicationHttpExceptionFilter } from '../src/api/rest/application-http-exception.filter.js';
import { ApplicationError } from '../src/application/errors/application-error.js';
import { RunApplicationError } from '../src/features/run/contracts/run.errors.js';
import { pageSize } from '../src/features/shared/pagination/page-size.js';
import {
  convertedCatalogError,
  convertedRunError,
  publicErrorVectors,
} from './public-error-vectors.js';

let fault: unknown;

@Controller('public-error-probe')
@Resolver()
class PublicErrorProbeController {
  @Get()
  restFail(): never {
    throw fault;
  }

  @Post()
  acceptJson(): string {
    return 'ok';
  }

  @Get('page')
  page(@Query('first', ParseIntPipe) first: number): number {
    return pageSize(first);
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
        ApplicationHttpExceptionFilter,
        ApplicationGraphqlExceptionFilter,
        PublicErrorExceptionFilter,
        { provide: APP_FILTER, useExisting: PublicErrorExceptionFilter },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => app.close());

  it.each(publicErrorVectors)(
    '$name preserves complete REST and Yoga envelopes',
    async (vector) => {
      fault = vector.error();
      const rest = await request(app.getHttpServer())
        .get('/public-error-probe')
        .expect(vector.rest.statusCode);
      expect(rest.body).toEqual(vector.rest);

      const graphql = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: '{ fail }' })
        .expect(200);
      expect(graphql.body).toEqual({
        data: null,
        errors: [
          {
            message: vector.rest.message,
            locations: [{ line: 1, column: 3 }],
            path: ['fail'],
            ...(vector.graphql === undefined ? {} : { extensions: vector.graphql }),
          },
        ],
      });
    },
  );

  it.each([
    ...['unknown_code', 'constructor', 'toString', '__proto__', 'run_not_found'].map((code) => ({
      name: `generic ApplicationError ${code}`,
      error: () => new ApplicationError({ code, details: { runId: 'r1', secret: 'hidden' } }),
    })),
    {
      name: 'technical Error and cause',
      error: () => new Error('secret message', { cause: new Error('secret cause') }),
    },
    {
      name: 'public-looking object',
      error: () => ({
        statusCode: 418,
        code: 'run_not_found',
        message: 'secret object',
        details: { secret: 'hidden' },
      }),
    },
    {
      name: 'malformed untrusted diagnostic',
      error: () =>
        convertedRunError(
          new RunManagerError('pipeline_compilation_failed', {
            diagnostics: [
              { family: 'pipeline', code: 'x', path: { secret: 'hidden' }, message: 'Allowed' },
            ],
          }),
        ),
    },
  ])('masks $name through both transports', async ({ error }) => {
    fault = error();
    const rest = await request(app.getHttpServer()).get('/public-error-probe').expect(500);
    expect(rest.body).toEqual({ statusCode: 500, message: 'Internal server error.' });
    const graphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ fail }' })
      .expect(200);
    expect(graphql.body).toEqual({
      data: null,
      errors: [
        {
          message: 'Internal server error.',
          locations: [{ line: 1, column: 3 }],
          path: ['fail'],
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        },
      ],
    });
  });

  it.each([
    {
      name: 'diagnostic',
      error: () => {
        const diagnostic = {
          family: 'pipeline',
          code: 'x',
          path: '/x',
          message: 'Allowed diagnostic',
          secret: 'hidden',
        };
        const details = { diagnostics: [diagnostic], secret: 'hidden' };
        return new RunApplicationError({ code: 'pipeline_compilation_failed', details });
      },
      expected: {
        statusCode: 422,
        code: 'pipeline_compilation_failed',
        message: 'Pipeline compilation failed.',
        path: null,
        details: {
          diagnostics: [
            { family: 'pipeline', code: 'x', path: '/x', message: 'Allowed diagnostic' },
          ],
        },
      },
    },
    {
      name: 'recovery attempt',
      error: () => {
        const attempt = { operationId: 'o1', attemptId: 'a1', secret: 'hidden' };
        const details = { runId: 'r1', attempts: [attempt], secret: 'hidden' };
        return new RunApplicationError({ code: 'run_recovery_required', details });
      },
      expected: {
        statusCode: 409,
        code: 'run_recovery_required',
        message: 'Run requires recovery before it can continue.',
        path: null,
        details: { runId: 'r1', attempts: [{ operationId: 'o1', attemptId: 'a1' }] },
      },
    },
  ])('allowlists structural extras on a known $name', async ({ error, expected }) => {
    fault = Object.assign(error(), { secret: 'outer secret', cause: new Error('secret cause') });
    const rest = await request(app.getHttpServer())
      .get('/public-error-probe')
      .expect(expected.statusCode);
    expect(rest.body).toEqual(expected);
    const graphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ fail }' })
      .expect(200);
    expect(graphql.body.errors[0].extensions).toEqual(expected);
    expect(graphql.body.errors[0].message).toBe(expected.message);
  });

  it.each([
    {
      name: 'validation array',
      error: new BadRequestException(['Name is required.']),
      expected: {
        statusCode: 400,
        code: 'INVALID_REQUEST',
        message: ['Name is required.'],
        error: 'Bad Request',
      },
    },
    {
      name: 'plain message',
      error: new BadRequestException('Name is required.'),
      expected: {
        statusCode: 400,
        code: 'INVALID_REQUEST',
        message: 'Name is required.',
        error: 'Bad Request',
      },
    },
    {
      name: 'raw parser error',
      error: Object.assign(new SyntaxError('Invalid JSON.'), {
        status: 400,
        type: 'entity.parse.failed',
      }),
      expected: { statusCode: 400, code: 'INVALID_REQUEST', message: 'Invalid JSON.' },
    },
    {
      name: 'explicit code',
      error: new BadRequestException({ code: 'EXPLICIT', message: ['Invalid.'], field: 'name' }),
      expected: { code: 'EXPLICIT', message: ['Invalid.'], field: 'name' },
    },
    {
      name: 'uncoded object',
      error: new BadRequestException({ message: 'Invalid.', field: 'name' }),
      expected: { statusCode: 400, code: 'INVALID_REQUEST', message: 'Invalid.', field: 'name' },
    },
  ])('preserves framework BadRequest $name', async ({ error, expected }) => {
    fault = error;
    const rest = await request(app.getHttpServer()).get('/public-error-probe').expect(400);
    expect(rest.body).toEqual(expected);
  });

  it('preserves the native malformed JSON envelope', async () => {
    const rest = await request(app.getHttpServer())
      .post('/public-error-probe')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    expect(rest.body).toEqual({
      statusCode: 400,
      code: 'INVALID_REQUEST',
      message: "Expected property name or '}' in JSON at position 1 (line 1 column 2)",
      error: 'Bad Request',
    });
  });

  it.each([
    ['bad', 'Validation failed (numeric string is expected)'],
    ['0', 'first must be an integer between 1 and 100.'],
  ])('preserves page representation/value validation for %s', async (first, message) => {
    const rest = await request(app.getHttpServer())
      .get('/public-error-probe/page')
      .query({ first })
      .expect(400);
    expect(rest.body).toEqual({
      statusCode: 400,
      code: 'INVALID_REQUEST',
      message,
      error: 'Bad Request',
    });
  });

  it.each([
    ['schema', '{ missingField }', 'GRAPHQL_VALIDATION_FAILED'],
    ['parse', '{', 'GRAPHQL_PARSE_FAILED'],
  ])('preserves native GraphQL %s errors', async (_name, query, code) => {
    const graphql = await request(app.getHttpServer()).post('/graphql').send({ query });
    expect(graphql.body).not.toHaveProperty('data');
    expect(graphql.body.errors[0].extensions.code).toBe(code);
    expect(graphql.body.errors[0]).not.toHaveProperty('path');
  });

  it('preserves explicit GraphQLError extensions', async () => {
    fault = new GraphQLError('Public GraphQL error.', { extensions: { code: 'PUBLIC_GRAPHQL' } });
    const graphql = await request(app.getHttpServer()).post('/graphql').send({ query: '{ fail }' });
    expect(graphql.body.errors[0]).toEqual({
      message: 'Public GraphQL error.',
      locations: [{ line: 1, column: 3 }],
      path: ['fail'],
      extensions: { code: 'PUBLIC_GRAPHQL' },
    });
  });

  it.each([
    {
      name: 'status 400',
      status: 400,
      code: 'catalog_definition_corrupt',
      path: '/pipeline',
      details: { reason: 'storage_json' },
    },
    {
      name: 'status 500',
      status: 500,
      code: 'catalog_definition_corrupt',
      path: '/pipeline',
      details: { reason: 'storage_json' },
    },
    {
      name: 'other code',
      status: 409,
      code: 'catalog_definition_invalid',
      path: '/pipeline',
      details: { reason: 'storage_json' },
    },
    {
      name: 'other path',
      status: 409,
      code: 'catalog_definition_corrupt',
      path: '/other',
      details: { reason: 'storage_json' },
    },
    {
      name: 'other reason',
      status: 409,
      code: 'catalog_definition_corrupt',
      path: '/pipeline',
      details: { reason: 'other' },
    },
  ])('does not convert unrelated Catalog $name', ({ status, code, path, details }) => {
    const error = new HttpException({ code, path, details }, status);
    expect(convertedCatalogError(error)).toBe(error);
  });
});
