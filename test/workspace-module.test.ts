import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { ProjectKind, ProjectStatus } from '../src/__generated__/client/enums.js';
import { AppModule } from '../src/app.module.js';
import { FileSystemAccessApiService } from '../src/features/file-system-access/file-system-access-api.service.js';
import { FileSystemPermission as P } from '../src/features/file-system/contracts/file-system.contracts.js';
import { FileSystemError } from '../src/features/file-system/contracts/file-system.error.js';
import { FileSystemApiService } from '../src/features/file-system/file-system-api.service.js';
import { FileSystemAccessContext } from '../src/features/file-system/policy/file-system-access-context.js';
import { ProjectApiService } from '../src/features/project/project-api.service.js';
import type { WorkspaceActorContext } from '../src/features/workspace/contracts/workspace.contracts.js';
import { WorkspaceStoreService } from '../src/features/workspace/storage/workspace-store.service.js';
import { WorkspaceApiService } from '../src/features/workspace/workspace-api.service.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { TransactionPrismaService } from '../src/infrastructure/database/transaction-prisma.service.js';

const execute = promisify(execFile);

describe('Workspace module and transports', () => {
  let app: INestApplication;
  let api: WorkspaceApiService;
  let projects: ProjectApiService;
  let prisma: PrismaService;
  let config: ConfigService;
  let policies: FileSystemAccessApiService;
  let root: string;
  let source: string;
  let projectId: string;
  let policyId: string;
  let context: WorkspaceActorContext;
  const projectIds: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    api = app.get(WorkspaceApiService);
    projects = app.get(ProjectApiService);
    prisma = app.get(PrismaService);
    config = app.get(ConfigService);
    policies = app.get(FileSystemAccessApiService);
  });

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'revo-workspace-'));
    source = path.join(root, 'source');
    await mkdir(source);
    await writeFile(path.join(source, 'keep.txt'), 'Keep external files');
    projectId = await seedProject();
    context = {
      actorId: 'test:workspace-operator',
      fileSystemAccess: FileSystemAccessContext.create({
        scopes: [{ rootPath: root, allow: [P.LIST, P.READ_METADATA, P.READ_FILE] }],
      }),
    };
    policyId = await policies.createPolicy({
      name: 'Workspace test',
      document: { allow: [P.LIST, P.READ_METADATA, P.READ_FILE] },
    });
    config.set('REVO_FILE_SYSTEM_BROWSER_ROOTS', JSON.stringify([root]));
    config.set('REVO_FILE_SYSTEM_BROWSER_POLICY_ID', policyId);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    const ids = projectIds.splice(0);
    await prisma.$transaction([
      prisma.workspaceEvent.deleteMany({ where: { workspace: { projectId: { in: ids } } } }),
      prisma.workspace.deleteMany({ where: { projectId: { in: ids } } }),
      prisma.branch.deleteMany({ where: { projectId: { in: ids } } }),
      prisma.project.deleteMany({ where: { id: { in: ids } } }),
      prisma.fileSystemPermissionPolicy.deleteMany({ where: { id: policyId } }),
    ]);
    await rm(root, { recursive: true, force: true });
  });

  afterAll(async () => app.close());

  async function seedProject() {
    const id = nanoid();
    projectIds.push(id);
    await prisma.project.create({
      data: {
        id,
        name: `Workspace project ${id}`,
        kind: ProjectKind.USER,
        status: ProjectStatus.ACTIVE,
      },
    });
    return id;
  }

  async function connect(
    name = 'Local files',
    sourcePath = source,
    type: 'folder' | 'repository' = 'folder',
    targetProject = projectId,
  ) {
    const result = await api.createWorkspace(
      { projectId: targetProject, name, type, sourcePath },
      context,
    );
    return api.getWorkspace({ projectId: targetProject, id: result.workspaceId });
  }

  async function createThroughRest(name = 'REST folder'): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/workspaces`)
      .send({ name, type: 'folder', sourcePath: source })
      .expect(201);

    return response.body.workspaceId;
  }

  test('connects a Folder with normalized metadata', async () => {
    const workspace = await connect('  Local files  ');
    expect(workspace).toMatchObject({
      projectId,
      name: 'Local files',
      description: '',
      type: 'folder',
      sourcePath: source,
      availability: 'AVAILABLE',
      lastErrorCode: null,
      version: 1,
      disconnectedAt: null,
    });
    expect(workspace.lastCheckedAt).not.toBeNull();
  });

  test('does not change Project records or external source files', async () => {
    const createdProject = await projects.createUserProject({ name: 'Workspace records baseline' });
    projectIds.push(createdProject.projectId);
    const before = await prisma.branch.findMany({ where: { projectId: createdProject.projectId } });
    await connect('Local files', source, 'folder', createdProject.projectId);
    expect(
      await prisma.branch.findMany({ where: { projectId: createdProject.projectId } }),
    ).toEqual(before);
    expect(await readFile(path.join(source, 'keep.txt'), 'utf8')).toBe('Keep external files');
  });

  test('projects expose connected Workspace summaries', async () => {
    const createdProject = await projects.createUserProject({ name: 'Workspace summary baseline' });
    projectIds.push(createdProject.projectId);
    await connect('Local files', source, 'folder', createdProject.projectId);
    const nested = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'query($query: String!) { projects(data: { query: $query }) { edges { node { summary { workspaceCount workspaces { name type } } adrs(data: { first: 1 }) { totalCount } } } } }',
        variables: { query: createdProject.projectId },
      })
      .expect(200);
    expect(nested.body.errors).toBeUndefined();
    expect(nested.body.data.projects.edges[0].node).toMatchObject({
      summary: { workspaceCount: 1 },
      adrs: { totalCount: 0 },
    });
  });

  test('records the create audit event', async () => {
    const workspace = await connect('Local files');
    expect(
      await prisma.workspaceEvent.findMany({ where: { workspaceId: workspace.id } }),
    ).toMatchObject([
      {
        actorId: context.actorId,
        operation: 'create',
        details: { name: 'Local files', sourcePath: source },
      },
    ]);
  });

  test('same external source can be connected to different Projects with independent ids', async () => {
    const a = await connect();
    const otherProject = await seedProject();
    const b = await connect('Shared source', source, 'folder', otherProject);
    expect(b.id).not.toBe(a.id);
    await expect(api.getWorkspace({ projectId: otherProject, id: a.id })).rejects.toMatchObject({
      code: 'WORKSPACE_NOT_FOUND',
    });
    await expect(
      api.updateWorkspace(
        { projectId: otherProject, id: a.id, expectedVersion: 1, name: 'wrong' },
        context,
      ),
    ).rejects.toMatchObject({ code: 'WORKSPACE_NOT_FOUND' });
  });

  test('updates metadata and source with stable id, checking only source changes', async () => {
    const workspace = await connect();
    await api.updateWorkspace(
      { projectId, id: workspace.id, expectedVersion: 1, name: 'Renamed', description: 'Details' },
      { actorId: context.actorId },
    );
    const renamed = await api.getWorkspace({ projectId, id: workspace.id });
    expect(renamed).toMatchObject({
      id: workspace.id,
      name: 'Renamed',
      description: 'Details',
      sourcePath: source,
      version: 2,
      lastCheckedAt: workspace.lastCheckedAt,
    });
    const missing = path.join(root, 'missing');
    await api.updateWorkspace(
      { projectId, id: workspace.id, expectedVersion: 2, sourcePath: missing },
      context,
    );
    expect(await api.getWorkspace({ projectId, id: workspace.id })).toMatchObject({
      id: workspace.id,
      sourcePath: missing,
      availability: 'NOT_FOUND',
      version: 3,
    });
  });

  test('manual availability check observes missing source and recovery', async () => {
    const workspace = await connect();
    await rm(source, { recursive: true });
    await api.checkWorkspace({ projectId, id: workspace.id, expectedVersion: 1 }, context);
    expect(await api.getWorkspace({ projectId, id: workspace.id })).toMatchObject({
      availability: 'NOT_FOUND',
      lastErrorCode: 'FILE_SYSTEM_NOT_FOUND',
      version: 2,
    });
    await mkdir(source);
    await api.checkWorkspace({ projectId, id: workspace.id, expectedVersion: 2 }, context);
    expect(await api.getWorkspace({ projectId, id: workspace.id })).toMatchObject({
      availability: 'AVAILABLE',
      lastErrorCode: null,
      version: 3,
    });
  });

  test('records authorized unavailable sources without creating directories', async () => {
    expect(await connect('Missing', path.join(root, 'missing'))).toMatchObject({
      availability: 'NOT_FOUND',
    });
    expect(await connect('File', path.join(source, 'keep.txt'))).toMatchObject({
      availability: 'NOT_DIRECTORY',
    });
  });

  test('requires trusted context and denies out-of-scope and symlink sources without persistence', async () => {
    const data = { projectId, name: 'Denied', type: 'folder' as const, sourcePath: source };
    await expect(api.createWorkspace(data)).rejects.toMatchObject({
      code: 'WORKSPACE_ACTOR_REQUIRED',
    });
    await expect(api.createWorkspace(data, { actorId: context.actorId })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
    const limited = {
      actorId: context.actorId,
      fileSystemAccess: FileSystemAccessContext.create({
        scopes: [{ rootPath: source, allow: [P.READ_METADATA] }],
      }),
    };
    await expect(api.createWorkspace({ ...data, sourcePath: root }, limited)).rejects.toMatchObject(
      { code: 'FILE_SYSTEM_PERMISSION_DENIED' },
    );
    const outside = path.join(root, 'outside');
    await mkdir(outside);
    await symlink(outside, path.join(source, 'escape'), 'dir');
    await expect(
      api.createWorkspace({ ...data, sourcePath: path.join(source, 'escape') }, limited),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    expect(await prisma.workspace.count({ where: { projectId } })).toBe(0);
  });

  test('OS access failures become an observation, while policy denial rejects the operation', async () => {
    const fs = app.get(FileSystemApiService);
    const entry = vi
      .spyOn(fs, 'getEntry')
      .mockRejectedValue(new FileSystemError('FILE_SYSTEM_ACCESS_DENIED'));
    expect(await connect()).toMatchObject({
      availability: 'ACCESS_DENIED',
      lastErrorCode: 'FILE_SYSTEM_ACCESS_DENIED',
    });
    entry.mockRejectedValue(new FileSystemError('FILE_SYSTEM_PERMISSION_DENIED'));
    await expect(connect()).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    expect(await prisma.workspace.count({ where: { projectId } })).toBe(1);
  });

  test('Repository validation accepts an empty Git working tree, while Folder keeps its chosen kind', async () => {
    await execute('git', ['init', '--quiet', source]);
    const configBefore = await readFile(path.join(source, '.git', 'config'), 'utf8');
    expect(await connect('Repository', source, 'repository')).toMatchObject({
      type: 'repository',
      availability: 'AVAILABLE',
    });
    expect(await connect('Folder', source, 'folder')).toMatchObject({
      type: 'folder',
      availability: 'AVAILABLE',
    });
    expect(await readFile(path.join(source, '.git', 'config'), 'utf8')).toBe(configBefore);
  });

  test('Repository rejects plain folders, invalid Git metadata and nested directories', async () => {
    expect(await connect('Plain', source, 'repository')).toMatchObject({
      availability: 'INVALID_REPOSITORY',
    });
    await mkdir(path.join(source, '.git'));
    expect(await connect('Invalid', source, 'repository')).toMatchObject({
      availability: 'INVALID_REPOSITORY',
    });
    await rm(path.join(source, '.git'), { recursive: true });
    await execute('git', ['init', '--quiet', source]);
    const nested = path.join(source, 'nested');
    await mkdir(nested);
    expect(await connect('Nested', nested, 'repository')).toMatchObject({
      availability: 'INVALID_REPOSITORY',
    });
  });

  test('supports a Git metadata pointer only within granted filesystem scopes', async () => {
    await execute('git', [
      'init',
      '--quiet',
      `--separate-git-dir=${path.join(root, 'metadata')}`,
      source,
    ]);
    expect(await connect('Separate metadata', source, 'repository')).toMatchObject({
      availability: 'AVAILABLE',
    });
    const limited = {
      actorId: context.actorId,
      fileSystemAccess: FileSystemAccessContext.create({
        scopes: [{ rootPath: source, allow: [P.READ_METADATA, P.READ_FILE] }],
      }),
    };
    await expect(
      api.createWorkspace(
        { projectId, name: 'Denied metadata', sourcePath: source, type: 'repository' },
        limited,
      ),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
  });

  test('Git metadata reads require READ_FILE and cannot follow config includes or symlink escapes', async () => {
    await execute('git', ['init', '--quiet', source]);
    const metadataOnly = {
      actorId: context.actorId,
      fileSystemAccess: FileSystemAccessContext.create({
        scopes: [{ rootPath: root, allow: [P.READ_METADATA] }],
      }),
    };
    await expect(
      api.createWorkspace(
        { projectId, name: 'Metadata only', sourcePath: source, type: 'repository' },
        metadataOnly,
      ),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await writeFile(
      path.join(source, '.git', 'config'),
      '[includeIf "gitdir:/workspace/"]\n  path = /outside/secret\n',
    );
    expect(await connect('Includes', source, 'repository')).toMatchObject({
      availability: 'CHECK_FAILED',
      lastErrorCode: 'WORKSPACE_UNSUPPORTED_GIT_CONFIG',
    });
    await rm(path.join(source, '.git', 'config'));
    await writeFile(path.join(root, 'external-config'), '[core]\n bare = false\n');
    await symlink(path.join(root, 'external-config'), path.join(source, '.git', 'config'));
    const limited = {
      actorId: context.actorId,
      fileSystemAccess: FileSystemAccessContext.create({
        scopes: [{ rootPath: source, allow: [P.READ_METADATA, P.READ_FILE] }],
      }),
    };
    await expect(
      api.createWorkspace(
        { projectId, name: 'Symlink config', sourcePath: source, type: 'repository' },
        limited,
      ),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
  });

  test('text reads require an explicit allowed context', async () => {
    const fs = app.get(FileSystemApiService);
    const textPath = path.join(source, 'keep.txt');
    expect(await fs.readTextFile({ path: textPath }, context.fileSystemAccess)).toBe(
      'Keep external files',
    );
    await expect(fs.readTextFile({ path: textPath })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
  });

  test('text read deny rules override allowed scopes', async () => {
    const fs = app.get(FileSystemApiService);
    const textPath = path.join(source, 'keep.txt');
    const denied = context.fileSystemAccess?.restrict({
      scopes: [
        {
          rootPath: root,
          allow: [P.READ_FILE],
          rules: [{ path: 'source/keep.txt', match: 'EXACT', deny: [P.READ_FILE] }],
        },
      ],
    });
    await expect(fs.readTextFile({ path: textPath }, denied)).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
  });

  test('text reads reject directories', async () => {
    const fs = app.get(FileSystemApiService);
    await expect(fs.readTextFile({ path: source }, context.fileSystemAccess)).rejects.toMatchObject(
      { code: 'FILE_SYSTEM_INVALID_PATH' },
    );
  });

  test('text reads enforce the maximum size', async () => {
    const fs = app.get(FileSystemApiService);
    const textPath = path.join(source, 'keep.txt');
    await writeFile(textPath, 'x'.repeat(65536));
    expect(await fs.readTextFile({ path: textPath }, context.fileSystemAccess)).toHaveLength(65536);
    await writeFile(textPath, 'x'.repeat(65537));
    await expect(
      fs.readTextFile({ path: textPath }, context.fileSystemAccess),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_TOO_LARGE' });
  });

  test('text reads report missing files', async () => {
    const fs = app.get(FileSystemApiService);
    const textPath = path.join(source, 'keep.txt');
    await rm(textPath);
    await expect(
      fs.readTextFile({ path: textPath }, context.fileSystemAccess),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_NOT_FOUND' });
  });

  test('archived Project remains readable and rejects every Workspace mutation', async () => {
    const realProject = await projects.createUserProject({ name: 'Workspace archive test' });
    projectId = realProject.projectId;
    projectIds.push(projectId);
    const workspace = await connect();
    await projects.archiveUserProject({ projectId });
    expect((await api.listWorkspaces({ projectId })).totalCount).toBe(1);
    expect(await api.getWorkspace({ projectId, id: workspace.id })).toMatchObject({
      id: workspace.id,
    });
    await expect(connect()).rejects.toMatchObject({ code: 'WORKSPACE_PROJECT_ARCHIVED' });
    await Promise.all(
      [
        () =>
          api.updateWorkspace(
            { projectId, id: workspace.id, expectedVersion: 1, name: 'No' },
            context,
          ),
        () => api.checkWorkspace({ projectId, id: workspace.id, expectedVersion: 1 }, context),
        () => api.disconnectWorkspace({ projectId, id: workspace.id, expectedVersion: 1 }, context),
      ].map((operation) =>
        expect(operation()).rejects.toMatchObject({ code: 'WORKSPACE_PROJECT_ARCHIVED' }),
      ),
    );
    expect(await prisma.workspaceEvent.count({ where: { workspaceId: workspace.id } })).toBe(1);
    await projects.restoreUserProject({ projectId });
    await api.updateWorkspace(
      { projectId, id: workspace.id, expectedVersion: 1, name: 'Restored' },
      context,
    );
  });

  test('disconnect retains source, identity and audit history and rejects further changes', async () => {
    const workspace = await connect();
    await api.disconnectWorkspace(
      { projectId, id: workspace.id, expectedVersion: 1 },
      { actorId: context.actorId },
    );
    expect((await api.listWorkspaces({ projectId })).totalCount).toBe(0);
    const disconnected = await api.getWorkspace({ projectId, id: workspace.id });
    expect(disconnected.disconnectedAt).not.toBeNull();
    expect(disconnected.version).toBe(2);
    expect(await readFile(path.join(source, 'keep.txt'), 'utf8')).toBe('Keep external files');
    await expect(
      api.updateWorkspace({ projectId, id: workspace.id, expectedVersion: 2, name: 'No' }, context),
    ).rejects.toMatchObject({ code: 'WORKSPACE_CONFLICT' });
    expect(
      await prisma.workspaceEvent.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: 'asc' },
      }),
    ).toMatchObject([{ operation: 'create' }, { operation: 'disconnect' }]);
  });

  test('concurrent mutations have one winner and an atomic audit event', async () => {
    const workspace = await connect();
    const results = await Promise.allSettled(
      ['First', 'Second'].map((name) =>
        api.updateWorkspace({ projectId, id: workspace.id, expectedVersion: 1, name }, context),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'WORKSPACE_CONFLICT' },
    });
    expect((await api.getWorkspace({ projectId, id: workspace.id })).version).toBe(2);
    expect(await prisma.workspaceEvent.count({ where: { workspaceId: workspace.id } })).toBe(2);
  });

  test('rolls back a Workspace update when its audit event cannot be written', async () => {
    const workspace = await connect('Before rollback');
    const transactions = app.get(TransactionPrismaService);
    const store = app.get(WorkspaceStoreService);
    const failure = new Error('forced audit failure');

    await expect(
      transactions.runSerializable(async (transaction) => {
        vi.spyOn(transaction.workspaceEvent, 'create').mockRejectedValueOnce(failure);

        return store.update(
          projectId,
          workspace.id,
          1,
          { name: 'Must roll back' },
          context.actorId,
          'update',
          { name: 'Must roll back' },
        );
      }),
    ).rejects.toBe(failure);

    expect(await api.getWorkspace({ projectId, id: workspace.id })).toMatchObject({
      name: 'Before rollback',
      version: 1,
    });
    expect(await prisma.workspaceEvent.count({ where: { workspaceId: workspace.id } })).toBe(1);
  });

  test('lists connected Workspaces by name then id and projects the first three plus total count', async () => {
    const empty = await projects.listUserProjects({ query: projectId });
    expect(empty.edges[0]?.node.summary).toEqual({ workspaces: [], workspaceCount: 0 });
    const records = [
      await connect('Delta'),
      await connect('Bravo'),
      await connect('Alpha'),
      await connect('Charlie'),
    ];
    const first = await api.listWorkspaces({ projectId, first: 2 });
    expect(first.edges.map((edge) => edge.node.name)).toEqual(['Alpha', 'Bravo']);
    const next = await api.listWorkspaces({
      projectId,
      first: 2,
      after: first.pageInfo.endCursor ?? '',
    });
    expect(next.edges.map((edge) => edge.node.name)).toEqual(['Charlie', 'Delta']);
    expect(next.totalCount).toBe(4);
    const listed = await projects.listUserProjects({ query: projectId });
    expect(listed.edges[0]?.node.summary).toEqual({
      workspaces: ['Alpha', 'Bravo', 'Charlie'].map((name) => ({ name, type: 'folder' })),
      workspaceCount: 4,
    });
    await api.disconnectWorkspace(
      { projectId, id: records[2]?.id ?? '', expectedVersion: 1 },
      context,
    );
    expect((await projects.listUserProjects({ query: projectId })).edges[0]?.node.summary).toEqual({
      workspaces: ['Bravo', 'Charlie', 'Delta'].map((name) => ({ name, type: 'folder' })),
      workspaceCount: 3,
    });
  });

  test('validates input and rejects missing or non-user Projects', async () => {
    await Promise.all(
      [
        { name: ' ' },
        { description: null },
        { sourcePath: '../relative' },
        { type: 'unknown' },
      ].map((invalid) =>
        expect(
          api.createWorkspace(
            {
              projectId,
              name: 'Valid',
              type: 'folder',
              sourcePath: source,
              ...invalid,
            } as Parameters<typeof api.createWorkspace>[0],
            context,
          ),
        ).rejects.toMatchObject({ code: 'WORKSPACE_INVALID_INPUT' }),
      ),
    );
    await expect(connect('Missing project', source, 'folder', nanoid())).rejects.toMatchObject({
      code: 'WORKSPACE_PROJECT_NOT_FOUND',
    });
    await prisma.project.update({ where: { id: projectId }, data: { kind: ProjectKind.SYSTEM } });
    await expect(connect()).rejects.toMatchObject({ code: 'WORKSPACE_PROJECT_NOT_FOUND' });
  });

  test('REST creates and retrieves Workspaces', async () => {
    const base = `/api/projects/${projectId}/workspaces`;
    const id = await createThroughRest();
    const got = await request(app.getHttpServer()).get(`${base}/${id}`).expect(200);
    expect(got.body).toMatchObject({ id, projectId, version: 1, availability: 'AVAILABLE' });
  });

  test('GraphQL updates and lists Workspaces', async () => {
    const id = await createThroughRest();
    const changed = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'mutation($data: UpdateWorkspaceInput!) { updateWorkspace(data: $data) }',
        variables: { data: { projectId, id, expectedVersion: 1, name: 'GraphQL folder' } },
      })
      .expect(200);
    expect(changed.body).toEqual({ data: { updateWorkspace: true } });
    const listed = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'query($data: WorkspaceListInput!) { workspaces(data: $data) { totalCount edges { node { id name type version } } } }',
        variables: { data: { projectId } },
      })
      .expect(200);
    expect(listed.body.data.workspaces).toMatchObject({
      totalCount: 1,
      edges: [{ node: { id, name: 'GraphQL folder', type: 'folder', version: 2 } }],
    });
  });

  test('REST Project lists include Workspace summaries', async () => {
    await createThroughRest('GraphQL folder');
    const projectList = await request(app.getHttpServer())
      .get('/api/projects')
      .query({ query: projectId })
      .expect(200);
    expect(projectList.body.edges[0].node.summary).toEqual({
      workspaces: [{ name: 'GraphQL folder', type: 'folder' }],
      workspaceCount: 1,
    });
  });

  test('REST checks and disconnects Workspaces with version validation', async () => {
    const base = `/api/projects/${projectId}/workspaces`;
    const id = await createThroughRest();
    await request(app.getHttpServer())
      .post(`${base}/${id}/check`)
      .send({ expectedVersion: 1 })
      .expect(200, 'true');
    await request(app.getHttpServer())
      .patch(`${base}/${id}`)
      .send({ expectedVersion: 1, name: 'Stale' })
      .expect(409);
    await request(app.getHttpServer())
      .post(`${base}/${id}/disconnect`)
      .send({ expectedVersion: 2 })
      .expect(200, 'true');
    const page = await request(app.getHttpServer()).get(base).expect(200);
    expect(page.body.totalCount).toBe(0);
  });

  test('REST audit events use the server actor', async () => {
    const id = await createThroughRest();
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/workspaces/${id}/disconnect`)
      .send({ expectedVersion: 1 })
      .expect(200, 'true');
    const events = await prisma.workspaceEvent.findMany({ where: { workspaceId: id } });
    expect(events.every((event) => event.actorId === 'system:local-api')).toBe(true);
  });

  test('transport permissions come from server configuration, never client fields', async () => {
    config.set('REVO_FILE_SYSTEM_BROWSER_ROOTS', '[]');
    const denied = await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/workspaces`)
      .send({
        name: 'Forged',
        type: 'folder',
        sourcePath: source,
        permissions: ['READ_METADATA'],
        context,
        policyId,
      })
      .expect(403);
    expect(denied.body.code).toBe('FILE_SYSTEM_PERMISSION_DENIED');
    const graphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'mutation($data: CreateWorkspaceInput!) { createWorkspace(data: $data) { workspaceId } }',
        variables: { data: { projectId, name: 'Denied', type: 'folder', sourcePath: source } },
      })
      .expect(200);
    expect(graphql.body.errors[0].extensions.code).toBe('FILE_SYSTEM_PERMISSION_DENIED');
    const forged = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'mutation($data: CreateWorkspaceInput!) { createWorkspace(data: $data) { workspaceId } }',
        variables: {
          data: {
            projectId,
            name: 'Forged',
            type: 'folder',
            sourcePath: source,
            permissions: ['READ_METADATA'],
          },
        },
      });
    expect(forged.body.errors[0].message).toContain('permissions');
    expect(await prisma.workspace.count({ where: { projectId } })).toBe(0);
  });

  test('REST validates optional values and GraphQL exposes stable Workspace error codes', async () => {
    const workspace = await connect();
    const base = `/api/projects/${projectId}/workspaces`;
    await request(app.getHttpServer())
      .post(base)
      .send({ name: 'Name', description: null, type: 'folder', sourcePath: source })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`${base}/${workspace.id}`)
      .send({ expectedVersion: 1, name: null })
      .expect(400);
    await request(app.getHttpServer()).get(base).query({ first: 'bad' }).expect(400);
    const stale = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'mutation($data: WorkspaceVersionInput!) { disconnectWorkspace(data: $data) }',
        variables: { data: { projectId, id: workspace.id, expectedVersion: 5 } },
      })
      .expect(200);
    expect(stale.body.errors[0].extensions.code).toBe('WORKSPACE_CONFLICT');
  });
});
