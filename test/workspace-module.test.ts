import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { ProjectKind, ProjectStatus } from '../src/__generated__/client/enums.js';
import { AppModule } from '../src/app.module.js';
import { FileSystemError } from '../src/features/file-system/contracts/file-system.error.js';
import { FileSystemApiService } from '../src/features/file-system/file-system-api.service.js';
import { ProjectApiService } from '../src/features/project/project-api.service.js';
import { WorkspaceApiService } from '../src/features/workspace/workspace-api.service.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

const execute = promisify(execFile);

describe('Workspace module and transports', () => {
  let app: INestApplication;
  let api: WorkspaceApiService;
  let projects: ProjectApiService;
  let prisma: PrismaService;
  let root: string;
  let source: string;
  let projectId: string;
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
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    const ids = projectIds.splice(0);
    await prisma.$transaction([
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
    return api.createWorkspace({ projectId: targetProject, name, type, sourcePath });
  }

  async function createThroughRest(name = 'REST folder') {
    const response = await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/workspaces`)
      .send({ name, type: 'folder', sourcePath: source })
      .expect(201);

    return response.body;
  }

  test('connects a Folder with normalized metadata', async () => {
    const workspace = await connect('  Local files  ');
    expect(workspace).toMatchObject({
      projectId,
      name: 'Local files',
      description: '',
      type: 'folder',
      sourcePath: source,
      isArchived: false,
      archivedAt: null,
    });
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

  test('single Project exposes the same summary and nested fields as a list item', async () => {
    const createdProject = await projects.createUserProject({ name: 'Unified Project model' });
    projectId = createdProject.projectId;
    projectIds.push(projectId);
    await connect();
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'query($id: ID!, $query: String!) { project(data: { id: $id }) { __typename summary { workspaceCount workspaces { name type } } adrs(data: { first: 1 }) { totalCount } } projects(data: { query: $query }) { edges { node { __typename summary { workspaceCount workspaces { name type } } adrs(data: { first: 1 }) { totalCount } } } } }',
        variables: { id: projectId, query: projectId },
      });
    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.project).toEqual(response.body.data.projects.edges[0].node);
    expect(response.body.data.project).toMatchObject({
      __typename: 'ProjectModel',
      summary: { workspaceCount: 1 },
      adrs: { totalCount: 0 },
    });
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
      api.updateWorkspace({ projectId: otherProject, id: a.id, name: 'wrong' }),
    ).rejects.toMatchObject({ code: 'WORKSPACE_NOT_FOUND' });
    await expect(api.archiveWorkspace({ projectId: otherProject, id: a.id })).rejects.toMatchObject(
      {
        code: 'WORKSPACE_NOT_FOUND',
      },
    );
    await api.archiveWorkspace({ projectId, id: a.id });
    await expect(api.restoreWorkspace({ projectId: otherProject, id: a.id })).rejects.toMatchObject(
      {
        code: 'WORKSPACE_NOT_FOUND',
      },
    );
  });

  test('updates metadata and source with stable id without probing the source', async () => {
    const workspace = await connect();
    await api.updateWorkspace({
      projectId,
      id: workspace.id,
      name: 'Renamed',
      description: 'Details',
    });
    const renamed = await api.getWorkspace({ projectId, id: workspace.id });
    expect(renamed).toMatchObject({
      id: workspace.id,
      name: 'Renamed',
      description: 'Details',
      sourcePath: source,
    });
    const missing = path.join(root, 'missing');
    await api.updateWorkspace({ projectId, id: workspace.id, sourcePath: missing });
    expect(await api.getWorkspace({ projectId, id: workspace.id })).toMatchObject({
      id: workspace.id,
      sourcePath: missing,
    });
  });

  test('manual availability check observes missing source and recovery', async () => {
    const workspace = await connect();
    await rm(source, { recursive: true });
    expect(await api.checkWorkspace({ projectId, id: workspace.id })).toMatchObject({
      availability: 'NOT_FOUND',
      errorCode: 'FILE_SYSTEM_NOT_FOUND',
    });
    await mkdir(source);
    expect(await api.checkWorkspace({ projectId, id: workspace.id })).toMatchObject({
      availability: 'AVAILABLE',
      errorCode: null,
    });
    expect(await api.getWorkspace({ projectId, id: workspace.id })).toEqual(workspace);
  });

  test('records unavailable sources without creating directories', async () => {
    const missing = await connect('Missing', path.join(root, 'missing'));
    expect(await api.checkWorkspace({ projectId, id: missing.id })).toMatchObject({
      availability: 'NOT_FOUND',
    });
    const file = await connect('File', path.join(source, 'keep.txt'));
    expect(await api.checkWorkspace({ projectId, id: file.id })).toMatchObject({
      availability: 'NOT_DIRECTORY',
    });
  });

  test('OS access failures become an availability observation', async () => {
    const fs = app.get(FileSystemApiService);
    vi.spyOn(fs, 'getEntry').mockRejectedValue(new FileSystemError('FILE_SYSTEM_ACCESS_DENIED'));
    const workspace = await connect();
    expect(await api.checkWorkspace({ projectId, id: workspace.id })).toMatchObject({
      availability: 'ACCESS_DENIED',
      errorCode: 'FILE_SYSTEM_ACCESS_DENIED',
    });
    expect(await prisma.workspace.count({ where: { projectId } })).toBe(1);
  });

  test('Repository validation accepts an empty Git working tree, while Folder keeps its chosen kind', async () => {
    await execute('git', ['init', '--quiet', source]);
    const configBefore = await readFile(path.join(source, '.git', 'config'), 'utf8');
    const repository = await connect('Repository', source, 'repository');
    expect(await api.checkWorkspace({ projectId, id: repository.id })).toMatchObject({
      availability: 'AVAILABLE',
    });
    const folder = await connect('Folder', source, 'folder');
    expect(await api.checkWorkspace({ projectId, id: folder.id })).toMatchObject({
      availability: 'AVAILABLE',
    });
    expect(await readFile(path.join(source, '.git', 'config'), 'utf8')).toBe(configBefore);
  });

  test('Repository rejects plain folders, invalid Git metadata and nested directories', async () => {
    const plain = await connect('Plain', source, 'repository');
    expect(await api.checkWorkspace({ projectId, id: plain.id })).toMatchObject({
      availability: 'INVALID_REPOSITORY',
    });
    await mkdir(path.join(source, '.git'));
    const invalid = await connect('Invalid', source, 'repository');
    expect(await api.checkWorkspace({ projectId, id: invalid.id })).toMatchObject({
      availability: 'INVALID_REPOSITORY',
    });
    await rm(path.join(source, '.git'), { recursive: true });
    await execute('git', ['init', '--quiet', source]);
    const nested = path.join(source, 'nested');
    await mkdir(nested);
    const nestedWorkspace = await connect('Nested', nested, 'repository');
    expect(await api.checkWorkspace({ projectId, id: nestedWorkspace.id })).toMatchObject({
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
    const workspace = await connect('Separate metadata', source, 'repository');
    expect(await api.checkWorkspace({ projectId, id: workspace.id })).toMatchObject({
      availability: 'AVAILABLE',
    });
  });

  test('checks candidate sources before creation without persisting or changing local files', async () => {
    const missing = path.join(root, 'missing');
    const file = path.join(source, 'keep.txt');
    const plainRepository = path.join(root, 'plain-repository');
    const invalidRepository = path.join(root, 'invalid-repository');
    const gitRepository = path.join(root, 'git-repository');
    await Promise.all([mkdir(plainRepository), mkdir(invalidRepository), mkdir(gitRepository)]);
    await mkdir(path.join(invalidRepository, '.git'));
    await execute('git', ['init', '--quiet', gitRepository]);
    const filesBefore = await readdir(root);

    await expect(
      api.checkWorkspaceSource({ type: 'folder', sourcePath: source }),
    ).resolves.toMatchObject({
      availability: 'AVAILABLE',
      errorCode: null,
    });
    await expect(
      api.checkWorkspaceSource({ type: 'repository', sourcePath: plainRepository }),
    ).resolves.toMatchObject({
      availability: 'INVALID_REPOSITORY',
      errorCode: 'WORKSPACE_INVALID_REPOSITORY',
    });
    await expect(
      api.checkWorkspaceSource({ type: 'repository', sourcePath: invalidRepository }),
    ).resolves.toMatchObject({
      availability: 'INVALID_REPOSITORY',
      errorCode: 'WORKSPACE_INVALID_REPOSITORY',
    });
    await expect(
      api.checkWorkspaceSource({ type: 'repository', sourcePath: gitRepository }),
    ).resolves.toMatchObject({
      availability: 'AVAILABLE',
      errorCode: null,
    });
    await expect(
      api.checkWorkspaceSource({ type: 'folder', sourcePath: missing }),
    ).resolves.toMatchObject({
      availability: 'NOT_FOUND',
      errorCode: 'FILE_SYSTEM_NOT_FOUND',
    });
    await expect(
      api.checkWorkspaceSource({ type: 'folder', sourcePath: file }),
    ).resolves.toMatchObject({
      availability: 'NOT_DIRECTORY',
      errorCode: 'FILE_SYSTEM_NOT_DIRECTORY',
    });
    expect(await prisma.workspace.count({ where: { projectId } })).toBe(0);
    expect(await readdir(root)).toEqual(filesBefore);
    expect(await readFile(file, 'utf8')).toBe('Keep external files');
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
        () => api.updateWorkspace({ projectId, id: workspace.id, name: 'No' }),
        () => api.checkWorkspace({ projectId, id: workspace.id }),
        () => api.archiveWorkspace({ projectId, id: workspace.id }),
        () => api.restoreWorkspace({ projectId, id: workspace.id }),
      ].map((operation) =>
        expect(operation()).rejects.toMatchObject({ code: 'WORKSPACE_PROJECT_ARCHIVED' }),
      ),
    );
    await projects.restoreUserProject({ projectId });
    await api.updateWorkspace({ projectId, id: workspace.id, name: 'Restored' });
  });

  test('archive, restore, source recovery and repeated state changes preserve the Workspace row', async () => {
    const workspace = await connect();
    const archived = await api.archiveWorkspace({ projectId, id: workspace.id });
    expect((await api.listWorkspaces({ projectId })).totalCount).toBe(0);
    expect(archived).toMatchObject({ id: workspace.id, isArchived: true });
    expect(archived.archivedAt).not.toBeNull();
    expect(await readFile(path.join(source, 'keep.txt'), 'utf8')).toBe('Keep external files');
    expect(await api.archiveWorkspace({ projectId, id: workspace.id })).toEqual(archived);
    await rm(source, { recursive: true });
    const restored = await api.restoreWorkspace({ projectId, id: workspace.id });
    expect(restored).toMatchObject({ id: workspace.id, isArchived: false, archivedAt: null });
    expect(await api.restoreWorkspace({ projectId, id: workspace.id })).toEqual(restored);
    expect(await api.checkWorkspace({ projectId, id: workspace.id })).toMatchObject({
      availability: 'NOT_FOUND',
      errorCode: 'FILE_SYSTEM_NOT_FOUND',
    });
    const replacement = path.join(root, 'replacement');
    await mkdir(replacement);
    const updated = await api.updateWorkspace({
      projectId,
      id: workspace.id,
      sourcePath: replacement,
    });
    expect(updated).toMatchObject({ id: workspace.id, sourcePath: replacement });
    expect(await api.checkWorkspace({ projectId, id: workspace.id })).toMatchObject({
      availability: 'AVAILABLE',
      errorCode: null,
    });
  });

  test('lists connected Workspaces by name then id and projects the first three plus total count', async () => {
    const empty = await api.getProjectWorkspaceSummaries({ projectIds: [projectId] });
    expect(empty[projectId]).toEqual({ workspaces: [], workspaceCount: 0 });
    await connect('Delta');
    await connect('Bravo');
    const alpha = await connect('Alpha');
    await connect('Charlie');
    const first = await api.listWorkspaces({ projectId, first: 2 });
    expect(first.edges.map((edge) => edge.node.name)).toEqual(['Alpha', 'Bravo']);
    const next = await api.listWorkspaces({
      projectId,
      first: 2,
      after: first.pageInfo.endCursor ?? '',
    });
    expect(next.edges.map((edge) => edge.node.name)).toEqual(['Charlie', 'Delta']);
    expect(next.totalCount).toBe(4);
    expect(
      (await api.getProjectWorkspaceSummaries({ projectIds: [projectId] }))[projectId],
    ).toEqual({
      workspaces: ['Alpha', 'Bravo', 'Charlie'].map((name) => ({ name, type: 'folder' })),
      workspaceCount: 4,
    });
    const archived = await api.archiveWorkspace({ projectId, id: alpha.id });
    expect(
      (await api.getProjectWorkspaceSummaries({ projectIds: [projectId] }))[projectId],
    ).toEqual({
      workspaces: ['Bravo', 'Charlie', 'Delta'].map((name) => ({ name, type: 'folder' })),
      workspaceCount: 3,
    });
    const includingArchived = await api.listWorkspaces({
      projectId,
      first: 2,
      includeArchived: true,
    });
    expect(includingArchived.totalCount).toBe(4);
    expect(includingArchived.edges.map((edge) => edge.node.id)).toContain(archived.id);
  });

  test('batch summaries keep projects isolated and count beyond the preview limit', async () => {
    const other = await seedProject();
    const empty = await seedProject();
    await Promise.all(['Delta', 'Charlie', 'Bravo', 'Alpha'].map((name) => connect(name)));
    const first = await connect('Same', source, 'folder', other);
    const second = await connect('Same', source, 'repository', other);
    const archived = await connect('Archived', source, 'folder', other);
    await api.archiveWorkspace({ projectId: other, id: archived.id });
    const missing = "missing' OR true --";
    const summaries = await api.getProjectWorkspaceSummaries({
      projectIds: [projectId, other, empty, missing],
    });
    expect(summaries[projectId]).toEqual({
      workspaceCount: 4,
      workspaces: ['Alpha', 'Bravo', 'Charlie'].map((name) => ({ name, type: 'folder' })),
    });
    expect(summaries[other]).toEqual({
      workspaceCount: 2,
      workspaces: [first, second]
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .map(({ name, type }) => ({ name, type })),
    });
    expect(summaries[empty]).toEqual({ workspaceCount: 0, workspaces: [] });
    expect(summaries[missing]).toEqual({ workspaceCount: 0, workspaces: [] });
    expect(await api.getProjectWorkspaceSummaries({ projectIds: [] })).toEqual({});
    expect(
      (await projects.listUserProjects({ query: projectId })).edges[0]?.node,
    ).not.toHaveProperty('summary');
  });

  test('OpenAPI exposes Workspace errors and integer/date-time representations', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const collection = document.paths['/api/projects/{projectId}/workspaces'];
    expect(collection?.get?.parameters).toContainEqual(
      expect.objectContaining({ name: 'first', schema: { type: 'integer' } }),
    );
    expect(collection?.post?.responses).toMatchObject({
      '400': {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/WorkspaceErrorResponse' } },
        },
      },
      '404': expect.any(Object),
      '409': expect.any(Object),
    });
    const sourceResponses = document.paths['/api/workspaces/check-source']?.post?.responses;
    expect(sourceResponses).toHaveProperty('200');
    expect(sourceResponses).toHaveProperty('400');
    expect(sourceResponses).not.toHaveProperty('404');
    expect(sourceResponses).not.toHaveProperty('409');
    expect(document.components?.schemas?.WorkspaceErrorResponse).toMatchObject({
      required: ['code', 'statusCode', 'message'],
      properties: {
        code: { type: 'string' },
        statusCode: { type: 'integer' },
        field: { type: 'string' },
      },
    });
    expect(document.components?.schemas?.WorkspaceResponse).toMatchObject({
      properties: {
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        archivedAt: { type: 'string', format: 'date-time', nullable: true },
      },
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
          api.createWorkspace({
            projectId,
            name: 'Valid',
            type: 'folder',
            sourcePath: source,
            ...invalid,
          } as Parameters<typeof api.createWorkspace>[0]),
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
    const created = await createThroughRest();
    expect(created).toMatchObject({ projectId, isArchived: false, archivedAt: null });
    const got = await request(app.getHttpServer()).get(`${base}/${created.id}`).expect(200);
    expect(got.body).toEqual(created);
  });

  test('GraphQL exposes full Workspace records for mutations and source checks', async () => {
    const created = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'mutation($data: CreateWorkspaceInput!) { createWorkspace(data: $data) { id projectId name description type sourcePath createdAt updatedAt isArchived archivedAt } }',
        variables: {
          data: { projectId, name: 'GraphQL folder', type: 'folder', sourcePath: source },
        },
      })
      .expect(200);
    expect(created.body.errors).toBeUndefined();
    expect(created.body.data.createWorkspace).toMatchObject({
      projectId,
      name: 'GraphQL folder',
      isArchived: false,
      archivedAt: null,
    });
    const { id } = created.body.data.createWorkspace;
    const changed = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'mutation($data: UpdateWorkspaceInput!) { updateWorkspace(data: $data) { id projectId name description type sourcePath createdAt updatedAt isArchived archivedAt } }',
        variables: { data: { projectId, id, name: 'GraphQL folder' } },
      })
      .expect(200);
    expect(changed.body.errors).toBeUndefined();
    expect(changed.body.data.updateWorkspace).toMatchObject({
      id,
      projectId,
      name: 'GraphQL folder',
      isArchived: false,
      archivedAt: null,
    });
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
    const checked = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'mutation($data: WorkspaceInput!) { checkWorkspace(data: $data) { availability errorCode } }',
        variables: { data: { projectId, id } },
      })
      .expect(200);
    expect(checked.body).toEqual({
      data: { checkWorkspace: { availability: 'AVAILABLE', errorCode: null } },
    });
    const archived = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'mutation($data: WorkspaceInput!) { archiveWorkspace(data: $data) { id isArchived archivedAt createdAt updatedAt } }',
        variables: { data: { projectId, id } },
      })
      .expect(200);
    expect(archived.body.errors).toBeUndefined();
    expect(archived.body.data.archiveWorkspace).toMatchObject({ id, isArchived: true });
    expect(archived.body.data.archiveWorkspace.archivedAt).not.toBeNull();
    const restored = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'mutation($data: WorkspaceInput!) { restoreWorkspace(data: $data) { id isArchived archivedAt } }',
        variables: { data: { projectId, id } },
      })
      .expect(200);
    expect(restored.body).toEqual({
      data: { restoreWorkspace: { id, isArchived: false, archivedAt: null } },
    });
    const preflight = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'mutation($data: WorkspaceSourceInput!) { checkWorkspaceSource(data: $data) { availability errorCode } }',
        variables: { data: { type: 'folder', sourcePath: source } },
      })
      .expect(200);
    expect(preflight.body).toEqual({
      data: { checkWorkspaceSource: { availability: 'AVAILABLE', errorCode: null } },
    });
    expect((await api.listWorkspaces({ projectId })).totalCount).toBe(1);
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

  test('REST checks and archives Workspaces', async () => {
    const base = `/api/projects/${projectId}/workspaces`;
    const { id } = await createThroughRest();
    await request(app.getHttpServer())
      .post(`${base}/${id}/check`)
      .send({})
      .expect(200, { availability: 'AVAILABLE', errorCode: null });
    await request(app.getHttpServer())
      .post('/api/workspaces/check-source')
      .send({ type: 'folder', sourcePath: source })
      .expect(200, { availability: 'AVAILABLE', errorCode: null });
    const updated = await request(app.getHttpServer())
      .patch(`${base}/${id}`)
      .send({ name: 'Updated' })
      .expect(200);
    expect(updated.body).toMatchObject({ id, name: 'Updated', isArchived: false });
    const archived = await request(app.getHttpServer())
      .post(`${base}/${id}/archive`)
      .send({})
      .expect(200);
    expect(archived.body).toMatchObject({ id, isArchived: true });
    const restored = await request(app.getHttpServer())
      .post(`${base}/${id}/restore`)
      .send({})
      .expect(200);
    expect(restored.body).toMatchObject({ id, isArchived: false, archivedAt: null });
    const page = await request(app.getHttpServer()).get(base).expect(200);
    expect(page.body.totalCount).toBe(1);
  });

  test('REST rejects a null description on create', async () => {
    const base = `/api/projects/${projectId}/workspaces`;
    const response = await request(app.getHttpServer())
      .post(base)
      .send({ name: 'Name', description: null, type: 'folder', sourcePath: source })
      .expect(400);
    expect(response.body.code).toBe('WORKSPACE_INVALID_INPUT');
    expect(response.body.field).toBe('description');
  });

  test('REST rejects a null name on update', async () => {
    const workspace = await connect();
    const base = `/api/projects/${projectId}/workspaces`;
    const response = await request(app.getHttpServer())
      .patch(`${base}/${workspace.id}`)
      .send({ name: null })
      .expect(400);
    expect(response.body.code).toBe('WORKSPACE_INVALID_INPUT');
    expect(response.body.field).toBe('name');
  });

  test('REST maps generic malformed requests to INVALID_REQUEST', async () => {
    const base = `/api/projects/${projectId}/workspaces`;
    const malformed = await request(app.getHttpServer())
      .post(base)
      .set('Content-Type', 'application/json')
      .send('{"name":')
      .expect(400);
    expect(malformed.body.code).toBe('INVALID_REQUEST');
    const nullBody = await request(app.getHttpServer())
      .post(base)
      .set('Content-Type', 'application/json')
      .send('null')
      .expect(400);
    expect(nullBody.body.code).toBe('INVALID_REQUEST');
  });

  test('REST rejects a nonnumeric page size with INVALID_REQUEST', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/projects/${projectId}/workspaces`)
      .query({ first: 'bad' })
      .expect(400);
    expect(response.body).toMatchObject({
      code: 'INVALID_REQUEST',
      message: 'Validation failed (numeric string is expected)',
    });
  });

  test('GraphQL preserves feature and native validation errors', async () => {
    const featureError = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'mutation($data: CreateWorkspaceInput!) { createWorkspace(data: $data) { id } }',
        variables: { data: { projectId, name: ' ', type: 'folder', sourcePath: source } },
      })
      .expect(200);
    expect(featureError.body.data).toBeNull();
    expect(featureError.body.errors[0].extensions).toMatchObject({
      code: 'WORKSPACE_INVALID_INPUT',
      field: 'name',
    });
    const nativeError = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'query { workspaces(data: { projectId: "project", first: "bad" }) { totalCount } }',
      })
      .expect(200);
    expect(nativeError.body.data).toBeUndefined();
    expect(nativeError.body.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
    const paginationError = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'query($data: WorkspaceListInput!) { workspaces(data: $data) { totalCount } }',
        variables: { data: { projectId, first: 0 } },
      })
      .expect(200);
    expect(paginationError.body.data).toBeNull();
    expect(paginationError.body).toMatchObject({ errors: [{ message: expect.any(String) }] });
  });
});
