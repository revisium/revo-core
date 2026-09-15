import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import type { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PublicErrorExceptionFilter } from '../src/api/errors/public-error-exception.filter.js';
import { ApplicationGraphqlExceptionFilter } from '../src/api/graphql/application-graphql-exception.filter.js';
import { FileSystemResolver } from '../src/api/graphql/file-system/file-system.resolver.js';
import { ApplicationHttpExceptionFilter } from '../src/api/rest/application-http-exception.filter.js';
import { FileSystemController } from '../src/api/rest/file-system/file-system.controller.js';
import { initSwagger } from '../src/api/rest/swagger.js';
import { FileSystemError } from '../src/features/file-system/contracts/file-system.error.js';
import { FileSystemModule } from '../src/features/file-system/file-system.module.js';
import { FileSystemService } from '../src/features/file-system/filesystem/file-system.service.js';

describe('Filesystem transport contracts', () => {
  let app: INestApplication;
  let root: string;
  let directory: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'revo-filesystem-http-'));
    directory = path.join(root, 'directory');
    await mkdir(directory);
    await mkdir(path.join(directory, 'docs'));
    await writeFile(path.join(directory, 'a.txt'), 'hello');
    const module = await Test.createTestingModule({
      imports: [
        FileSystemModule,
        GraphQLModule.forRoot<YogaDriverConfig>({
          driver: YogaDriver,
          autoSchemaFile: true,
          path: '/graphql',
        }),
      ],
      providers: [
        FileSystemResolver,
        ApplicationHttpExceptionFilter,
        ApplicationGraphqlExceptionFilter,
        PublicErrorExceptionFilter,
        { provide: APP_FILTER, useExisting: PublicErrorExceptionFilter },
      ],
      controllers: [FileSystemController],
    }).compile();
    app = module.createNestApplication();
    initSwagger(app);
    await app.init();
    await app.listen(0);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
    await rm(root, { recursive: true, force: true });
  });

  test('REST and GraphQL access the filesystem without browser policy configuration', async () => {
    const rest = await request(app.getHttpServer())
      .get('/file-system/entry')
      .query({ path: directory })
      .expect(200);
    expect(rest.body.type).toBe('DIRECTORY');
    const graphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'query($data: FileSystemEntryInput!) { fileSystemEntry(data: $data) { path } }',
        variables: { data: { path: directory } },
      })
      .expect(200);
    expect(graphql.body.errors).toBeUndefined();
    expect(graphql.body.data.fileSystemEntry.path).toBe(directory);
  });

  test('transports retain directory creation and input errors', async () => {
    const created = await request(app.getHttpServer())
      .post('/file-system/directory')
      .send({ parentPath: directory, name: 'rest-created' })
      .expect(201);
    expect(created.body.path).toBe(path.join(directory, 'rest-created'));
    await request(app.getHttpServer())
      .post('/file-system/directory')
      .send({ parentPath: directory, name: '../escape' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/file-system/directory')
      .query({ path: directory, first: 'bad' })
      .expect(400);
  });

  test('OS access rejection retains a distinct public error', async () => {
    vi.spyOn(app.get(FileSystemService), 'metadata').mockRejectedValue(
      new FileSystemError({ code: 'FILE_SYSTEM_ACCESS_DENIED', details: {} }),
    );
    const rest = await request(app.getHttpServer())
      .get('/file-system/entry')
      .query({ path: directory })
      .expect(403);
    expect(rest.body.code).toBe('FILE_SYSTEM_ACCESS_DENIED');
  });
});
