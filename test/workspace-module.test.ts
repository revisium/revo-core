import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { ProjectKind, ProjectStatus } from '../src/__generated__/client/enums.js';
import { AppModule } from '../src/app.module.js';
import { FileSystemError } from '../src/features/file-system/contracts/file-system.error.js';
import { FileSystemApiService } from '../src/features/file-system/file-system-api.service.js';
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
  let root: string;
  let source: string;
  let projectId: string;
  let context: WorkspaceActorContext;
  const projectIds: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    api = app.get(WorkspaceApiService);
    projects = app.get(ProjectApiService);
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'revo-workspace-'));
    source = path.join(root, 'source');
    await mkdir(source);
    await writeFile(path.join(source, 'keep.txt'), 'Keep external files');
    projectId = await seedProject();
    context = { actorId: 'test:workspace-operator' };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    const ids = projectIds.splice(0);
    await prisma.$transaction([
      prisma.workspaceEvent.deleteMany({ where: { workspace: { projectId: { in: ids } } } }),
      prisma.workspace.deleteMany({ where: { projectId: { in: ids } } }),
      prisma.branch.deleteMany({ where: { projectId: { in: ids } } }),
      prisma.project.deleteMany({ where: { id: { in: ids } } }),
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
      api.updateWorkspace({ projectId: otherProject, id: a.id, name: 'wrong' }, context),
    ).rejects.toMatchObject({ code: 'WORKSPACE_NOT_FOUND' });
  });

  test('updates metadata and source with stable id, checking only source changes', async () => {
    const workspace = await connect();
    await api.updateWorkspace(
      { projectId, id: workspace.id, name: 'Renamed', description: 'Details' },
      { actorId: context.actorId },
    );
    const renamed = await api.getWorkspace({ projectId, id: workspace.id });
    expect(renamed).toMatchObject({
      id: workspace.id,
      name: 'Renamed',
      description: 'Details',
      sourcePath: source,
      lastCheckedAt: workspace.lastCheckedAt,
    });
    const missing = path.join(root, 'missing');
    await api.updateWorkspace({ projectId, id: workspace.id, sourcePath: missing }, context);
    expect(await api.getWorkspace({ projectId, id: workspace.id })).toMatchObject({
      id: workspace.id,
      sourcePath: missing,
      availability: 'NOT_FOUND',
    });
  });

  test('manual availability check observes missing source and recovery', async () => {
    const workspace = await connect();
    await rm(source, { recursive: true });
    await api.checkWorkspace({ projectId, id: workspace.id }, context);
    expect(await api.getWorkspace({ projectId, id: workspace.id })).toMatchObject({
      availability: 'NOT_FOUND',
      lastErrorCode: 'FILE_SYSTEM_NOT_FOUND',
    });
    await mkdir(source);
    await api.checkWorkspace({ projectId, id: workspace.id }, context);
    expect(await api.getWorkspace({ projectId, id: workspace.id })).toMatchObject({
      availability: 'AVAILABLE',
      lastErrorCode: null,
    });
  });

  test('records unavailable sources without creating directories', async () => {
    expect(await connect('Missing', path.join(root, 'missing'))).toMatchObject({
      availability: 'NOT_FOUND',
    });
    expect(await connect('File', path.join(source, 'keep.txt'))).toMatchObject({
      availability: 'NOT_DIRECTORY',
    });
  });

  test('requires an audit actor context before creating a Workspace', async () => {
    const data = { projectId, name: 'Denied', type: 'folder' as const, sourcePath: source };
    await expect(api.createWorkspace(data)).rejects.toMatchObject({
      code: 'WORKSPACE_ACTOR_REQUIRED',
    });
    expect(await prisma.workspace.count({ where: { projectId } })).toBe(0);
  });

  test('OS access failures become an availability observation', async () => {
    const fs = app.get(FileSystemApiService);
    vi.spyOn(fs, 'getEntry').mockRejectedValue(new FileSystemError('FILE_SYSTEM_ACCESS_DENIED'));
    expect(await connect()).toMatchObject({
      availability: 'ACCESS_DENIED',
      lastErrorCode: 'FILE_SYSTEM_ACCESS_DENIED',
    });
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

  test('supports a Git metadata pointer', async () => {
    await execute('git', [
      'init',
      '--quiet',
      `--separate-git-dir=${path.join(root, 'metadata')}`,
      source,
    ]);
    expect(await connect('Separate metadata', source, 'repository')).toMatchObject({
      availability: 'AVAILABLE',
    });
  });

  test('text reads do not require a permission context', async () => {
    const fs = app.get(FileSystemApiService);
    const textPath = path.join(source, 'keep.txt');
    expect(await fs.readTextFile({ path: textPath })).toBe('Keep external files');
  });

  test('text reads reject directories', async () => {
    const fs = app.get(FileSystemApiService);
    await expect(fs.readTextFile({ path: source })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_INVALID_PATH',
    });
  });

  test('text reads enforce the maximum size', async () => {
    const fs = app.get(FileSystemApiService);
    const textPath = path.join(source, 'keep.txt');
    await writeFile(textPath, 'x'.repeat(65536));
    expect(await fs.readTextFile({ path: textPath })).toHaveLength(65536);
    await writeFile(textPath, 'x'.repeat(65537));
    await expect(fs.readTextFile({ path: textPath })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_TOO_LARGE',
    });
  });

  test('text reads report missing files', async () => {
    const fs = app.get(FileSystemApiService);
    const textPath = path.join(source, 'keep.txt');
    await rm(textPath);
    await expect(fs.readTextFile({ path: textPath })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_NOT_FOUND',
    });
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
        () => api.updateWorkspace({ projectId, id: workspace.id, name: 'No' }, context),
        () => api.checkWorkspace({ projectId, id: workspace.id }, context),
        () => api.disconnectWorkspace({ projectId, id: workspace.id }, context),
      ].map((operation) =>
        expect(operation()).rejects.toMatchObject({ code: 'WORKSPACE_PROJECT_ARCHIVED' }),
      ),
    );
    expect(await prisma.workspaceEvent.count({ where: { workspaceId: workspace.id } })).toBe(1);
    await projects.restoreUserProject({ projectId });
    await api.updateWorkspace({ projectId, id: workspace.id, name: 'Restored' }, context);
  });

  test('disconnect retains source, identity and audit history and rejects further changes', async () => {
    const workspace = await connect();
    await api.disconnectWorkspace({ projectId, id: workspace.id }, { actorId: context.actorId });
    expect((await api.listWorkspaces({ projectId })).totalCount).toBe(0);
    const disconnected = await api.getWorkspace({ projectId, id: workspace.id });
    expect(disconnected.disconnectedAt).not.toBeNull();
    expect(await readFile(path.join(source, 'keep.txt'), 'utf8')).toBe('Keep external files');
    await expect(
      api.updateWorkspace({ projectId, id: workspace.id, name: 'No' }, context),
    ).rejects.toMatchObject({ code: 'WORKSPACE_CONFLICT' });
    expect(
      await prisma.workspaceEvent.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: 'asc' },
      }),
    ).toMatchObject([{ operation: 'create' }, { operation: 'disconnect' }]);
  });

  test('concurrent mutations preserve their audit events', async () => {
    const workspace = await connect();
    const results = await Promise.allSettled(
      ['First', 'Second'].map((name) =>
        api.updateWorkspace({ projectId, id: workspace.id, name }, context),
      ),
    );
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    expect(await prisma.workspaceEvent.count({ where: { workspaceId: workspace.id } })).toBe(3);
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
          { name: 'Must roll back' },
          context.actorId,
          'update',
          { name: 'Must roll back' },
        );
      }),
    ).rejects.toBe(failure);

    expect(await api.getWorkspace({ projectId, id: workspace.id })).toMatchObject({
      name: 'Before rollback',
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
    await api.disconnectWorkspace({ projectId, id: records[2]?.id ?? '' }, context);
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
    expect(got.body).toMatchObject({ id, projectId, availability: 'AVAILABLE' });
  });

  test('GraphQL updates and lists Workspaces', async () => {
    const id = await createThroughRest();
    const changed = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'mutation($data: UpdateWorkspaceInput!) { updateWorkspace(data: $data) }',
        variables: { data: { projectId, id, name: 'GraphQL folder' } },
      })
      .expect(200);
    expect(changed.body).toEqual({ data: { updateWorkspace: true } });
    const listed = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'query($data: WorkspaceListInput!) { workspaces(data: $data) { totalCount edges { node { id name type } } } }',
        variables: { data: { projectId } },
      })
      .expect(200);
    expect(listed.body.data.workspaces).toMatchObject({
      totalCount: 1,
      edges: [{ node: { id, name: 'GraphQL folder', type: 'folder' } }],
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

  test('REST checks and disconnects Workspaces', async () => {
    const base = `/api/projects/${projectId}/workspaces`;
    const id = await createThroughRest();
    await request(app.getHttpServer()).post(`${base}/${id}/check`).send({}).expect(200, 'true');
    await request(app.getHttpServer())
      .patch(`${base}/${id}`)
      .send({ name: 'Updated' })
      .expect(200, 'true');
    await request(app.getHttpServer())
      .post(`${base}/${id}/disconnect`)
      .send({})
      .expect(200, 'true');
    const page = await request(app.getHttpServer()).get(base).expect(200);
    expect(page.body.totalCount).toBe(0);
  });

  test('REST audit events use the server actor', async () => {
    const id = await createThroughRest();
    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/workspaces/${id}/disconnect`)
      .send({})
      .expect(200, 'true');
    const events = await prisma.workspaceEvent.findMany({ where: { workspaceId: id } });
    expect(events.every((event) => event.actorId === 'system:local-api')).toBe(true);
  });

  test('REST rejects a null description on create', async () => {
    const base = `/api/projects/${projectId}/workspaces`;
    const response = await request(app.getHttpServer())
      .post(base)
      .send({ name: 'Name', description: null, type: 'folder', sourcePath: source })
      .expect(400);
    expect(response.body.code).toBe('WORKSPACE_INVALID_INPUT');
  });

  test('REST rejects a null name on update', async () => {
    const workspace = await connect();
    const base = `/api/projects/${projectId}/workspaces`;
    const response = await request(app.getHttpServer())
      .patch(`${base}/${workspace.id}`)
      .send({ name: null })
      .expect(400);
    expect(response.body.code).toBe('WORKSPACE_INVALID_INPUT');
  });

  test('REST rejects a nonnumeric page size', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/projects/${projectId}/workspaces`)
      .query({ first: 'bad' })
      .expect(400);
    expect(response.body.message).toBe('Validation failed (numeric string is expected)');
  });
});
