import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { beforeEach, afterEach, describe, test, expect, vi } from 'vitest';

import { FileSystemBrowserAccessService } from '../src/api/file-system/file-system-browser-access.service.js';
import { FileSystemResolver } from '../src/api/graphql/file-system/file-system.resolver.js';
import { FileSystemController } from '../src/api/rest/file-system/file-system.controller.js';
import { initSwagger } from '../src/api/rest/swagger.js';
import { databaseConfig } from '../src/config/database.config.js';
import { FileSystemAccessApiService } from '../src/features/file-system-access/file-system-access-api.service.js';
import { FileSystemAccessModule } from '../src/features/file-system-access/file-system-access.module.js';
import { FileSystemPermission as P } from '../src/features/file-system/contracts/file-system.contracts.js';
import { FileSystemError } from '../src/features/file-system/contracts/file-system.error.js';
import { FileSystemModule } from '../src/features/file-system/file-system.module.js';
import { FileSystemService } from '../src/features/file-system/filesystem/file-system.service.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

describe('Filesystem transport contracts', () => {
  let app: INestApplication;
  let root: string;
  let scope: string;
  let config: ConfigService;
  let policies: FileSystemAccessApiService;
  let policyId: string;

  beforeEach(async () => {
    for (const key of [
      'REVO_FILE_SYSTEM_BROWSER_ROOTS',
      'REVO_FILE_SYSTEM_BROWSER_POLICY_ID',
      'REVO_FILE_SYSTEM_BROWSER_CREATE_DIRECTORY',
    ]) {
      vi.stubEnv(key, undefined);
    }

    root = await mkdtemp(path.join(tmpdir(), 'revo-filesystem-http-'));
    scope = path.join(root, 'scope');
    await mkdir(scope);
    await mkdir(path.join(scope, 'docs'));
    await writeFile(path.join(scope, 'a.txt'), 'hello');
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig], ignoreEnvFile: true }),
        FileSystemAccessModule,
        FileSystemModule,
        GraphQLModule.forRoot<YogaDriverConfig>({
          driver: YogaDriver,
          autoSchemaFile: true,
          path: '/graphql',
        }),
      ],
      providers: [FileSystemResolver, FileSystemBrowserAccessService],
      controllers: [FileSystemController],
    }).compile();
    app = module.createNestApplication();
    initSwagger(app);
    await app.init();
    config = app.get(ConfigService);
    policies = app.get(FileSystemAccessApiService);
    policyId = await policies.createPolicy({
      name: 'Folder browser test',
      document: { allow: [P.LIST, P.READ_METADATA] },
    });
    config.set('REVO_FILE_SYSTEM_BROWSER_ROOTS', JSON.stringify([scope]));
    config.set('REVO_FILE_SYSTEM_BROWSER_POLICY_ID', policyId);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await app.get(PrismaService).fileSystemPermissionPolicy.deleteMany({ where: { id: policyId } });
    await app.close();
    await rm(root, { recursive: true, force: true });
  });

  test('REST browses roots, entries, directories and returns parent navigation', async () => {
    const roots = await request(app.getHttpServer()).get('/file-system/roots').expect(200);
    expect(roots.body.edges.map((edge: { node: { path: string } }) => edge.node.path)).toEqual([
      scope,
    ]);
    const entry = await request(app.getHttpServer())
      .get('/file-system/entry')
      .query({ path: scope })
      .expect(200);
    expect(entry.body.type).toBe('DIRECTORY');
    const directory = await request(app.getHttpServer())
      .get('/file-system/directory')
      .query({ path: scope, directoriesOnly: true })
      .expect(200);
    expect(directory.body.parentPath).toBeNull();
    expect(directory.body.entries.edges[0].node.name).toBe('docs');
    const child = await request(app.getHttpServer())
      .get('/file-system/directory')
      .query({ path: path.join(scope, 'docs') })
      .expect(200);
    expect(child.body.parentPath).toBe(scope);
  });

  test('GraphQL browses using the same application contract', async () => {
    const result = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'query($data: FileSystemDirectoryInput!) { fileSystemRoots { edges { node { path } } } fileSystemDirectory(data: $data) { path parentPath entries { totalCount edges { node { name type } } } } }',
        variables: { data: { path: scope } },
      })
      .expect(200);
    expect(result.body.errors).toBeUndefined();
    expect(result.body.data.fileSystemRoots.edges[0].node.path).toBe(scope);
    expect(result.body.data.fileSystemDirectory.entries.totalCount).toBe(2);
  });

  test('REST and GraphQL create only when server configuration allows it', async () => {
    await request(app.getHttpServer())
      .post('/file-system/directory')
      .send({
        parentPath: scope,
        name: 'denied',
        permissions: ['CREATE_DIRECTORY'],
        context: { scopes: [{ rootPath: scope, allow: ['CREATE_DIRECTORY'] }] },
      })
      .expect(403);
    await policies.updatePolicy({
      id: policyId,
      expectedVersion: 1,
      name: 'Writable browser',
      document: { allow: [P.LIST, P.READ_METADATA, P.CREATE_DIRECTORY] },
    });
    const created = await request(app.getHttpServer())
      .post('/file-system/directory')
      .send({ parentPath: scope, name: 'rest-created' })
      .expect(201);
    expect(created.body.path).toBe(path.join(scope, 'rest-created'));
    const graphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'mutation($data: CreateFileSystemDirectoryInput!) { createFileSystemDirectory(data: $data) { path type } }',
        variables: { data: { parentPath: scope, name: 'graphql-created' } },
      })
      .expect(200);
    expect(graphql.body.errors).toBeUndefined();
    expect(graphql.body.data.createFileSystemDirectory.path).toBe(
      path.join(scope, 'graphql-created'),
    );
    await request(app.getHttpServer())
      .post('/file-system/directory')
      .send({ parentPath: scope, name: '../escape' })
      .expect(400);
  });

  test('no server context grants no access regardless of client permissions', async () => {
    config.set('REVO_FILE_SYSTEM_BROWSER_ROOTS', '[]');
    const roots = await request(app.getHttpServer()).get('/file-system/roots').expect(200);
    expect(roots.body.totalCount).toBe(0);
    const denied = await request(app.getHttpServer())
      .get('/file-system/entry')
      .query({ path: scope, permissions: 'READ_METADATA' })
      .expect(403);
    expect(denied.body.code).toBe('FILE_SYSTEM_PERMISSION_DENIED');
    const graphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'query($data: FileSystemEntryInput!) { fileSystemEntry(data: $data) { path } }',
        variables: { data: { path: scope } },
      })
      .expect(200);
    expect(graphql.body.errors[0].extensions.code).toBe('FILE_SYSTEM_PERMISSION_DENIED');
    const forged = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'query($data: FileSystemEntryInput!) { fileSystemEntry(data: $data) { path } }',
        variables: { data: { path: scope, permissions: ['READ_METADATA'] } },
      });
    expect(forged.body.errors[0].message).toContain('permissions');
  });

  test('roots without a persisted policy grant no access, even with the old creation toggle', async () => {
    config.set('REVO_FILE_SYSTEM_BROWSER_POLICY_ID', '');
    config.set('REVO_FILE_SYSTEM_BROWSER_CREATE_DIRECTORY', 'true');
    const roots = await request(app.getHttpServer()).get('/file-system/roots').expect(200);
    expect(roots.body.totalCount).toBe(0);
    const denied = await request(app.getHttpServer())
      .post('/file-system/directory')
      .send({ parentPath: scope, name: 'denied', policyId })
      .expect(403);
    expect(denied.body.code).toBe('FILE_SYSTEM_PERMISSION_DENIED');
  });

  test('revoking the browser policy blocks subsequent REST and GraphQL calls', async () => {
    await request(app.getHttpServer()).get('/file-system/entry').query({ path: scope }).expect(200);
    await policies.revokePolicy({ id: policyId, expectedVersion: 1 });
    const rest = await request(app.getHttpServer())
      .get('/file-system/entry')
      .query({ path: scope })
      .expect(403);
    expect(rest.body.code).toBe('FILE_SYSTEM_PERMISSION_DENIED');
    const graphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'query($data: FileSystemEntryInput!) { fileSystemEntry(data: $data) { path } }',
        variables: { data: { path: scope } },
      })
      .expect(200);
    expect(graphql.body.errors[0].extensions.code).toBe('FILE_SYSTEM_PERMISSION_DENIED');
  });

  test('OS access rejection retains a distinct public error in both transports', async () => {
    vi.spyOn(app.get(FileSystemService), 'metadata').mockRejectedValue(
      new FileSystemError('FILE_SYSTEM_ACCESS_DENIED'),
    );
    const rest = await request(app.getHttpServer())
      .get('/file-system/entry')
      .query({ path: scope })
      .expect(403);
    expect(rest.body.code).toBe('FILE_SYSTEM_ACCESS_DENIED');
    const graphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'query($data: FileSystemEntryInput!) { fileSystemEntry(data: $data) { path } }',
        variables: { data: { path: scope } },
      })
      .expect(200);
    expect(graphql.body.errors[0].extensions.code).toBe('FILE_SYSTEM_ACCESS_DENIED');
  });

  test('REST rejects malformed filters and pagination representations', async () => {
    await request(app.getHttpServer())
      .get('/file-system/directory')
      .query({ path: scope, first: 'abc' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/file-system/directory')
      .query({ path: scope, directoriesOnly: 'maybe' })
      .expect(400);
    const missingPath = await request(app.getHttpServer()).get('/file-system/entry').expect(400);
    expect(missingPath.body.code).toBe('FILE_SYSTEM_INVALID_PATH');
  });
});
