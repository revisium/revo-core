import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { RunSnapshot } from '@revisium/revo-run';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';

import { ProjectKind, ProjectStatus } from '../src/__generated__/client/enums.js';
import { RunResolver } from '../src/api/graphql/run/run.resolver.js';
import { RunController } from '../src/api/rest/run/run.controller.js';
import { AppModule } from '../src/app.module.js';
import { AgentConfigurationWarmup } from '../src/features/agent-definitions/configurations/agent-configuration-warmup.js';
import { RunErrorText } from '../src/features/run/contracts/errors.en.js';
import { RunPublicError } from '../src/features/run/contracts/run.errors.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { RevoRunService } from '../src/infrastructure/run-runtime/revo-run.service.js';

describe('run collection transports', () => {
  test('GraphQL forwards the required project and optional list filters', async () => {
    const page = {
      edges: [],
      totalCount: 0,
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    };
    const listRuns = vi.fn<() => Promise<typeof page>>().mockResolvedValue(page);
    const resolver = new RunResolver({ listRuns } as never);
    const input = {
      projectId: 'project-1',
      statuses: ['running' as const],
      first: 20,
      after: 'cursor',
    };

    await expect(resolver.runs(input)).resolves.toBe(page);
    expect(listRuns).toHaveBeenCalledWith(input);
  });

  test('REST converts one comma separated statuses parameter and preserves the connection', async () => {
    const page = {
      edges: [],
      totalCount: 0,
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    };
    const listRuns = vi.fn<() => Promise<typeof page>>().mockResolvedValue(page);
    const controller = new RunController({ listRuns } as never);

    await expect(controller.listRuns('project-1', 'running,failed', 20, 'cursor')).resolves.toBe(
      page,
    );
    expect(listRuns).toHaveBeenCalledWith({
      projectId: 'project-1',
      statuses: ['running', 'failed'],
      first: 20,
      after: 'cursor',
    });
  });

  test.each([[''], [['running', 'failed']]])(
    'REST rejects malformed statuses representation %j',
    (statuses) => {
      const controller = new RunController({ listRuns: vi.fn<() => Promise<never>>() } as never);

      expect(() => controller.listRuns('project-1', statuses)).toThrow(RunPublicError);
    },
  );
});

describe('run collection transport boundaries', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const projectIds: string[] = [];
  const runtime = { getRun: vi.fn<RevoRunService['getRun']>() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AgentConfigurationWarmup)
      .useValue({})
      .overrideProvider(RevoRunService)
      .useValue(runtime)
      .compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    runtime.getRun.mockReset().mockResolvedValue(undefined);
    const ids = projectIds.splice(0);
    if (ids.length > 0) {
      await prisma.$transaction([
        prisma.projectRun.deleteMany({ where: { projectId: { in: ids } } }),
        prisma.project.deleteMany({ where: { id: { in: ids } } }),
      ]);
    }
  });

  afterAll(async () => app.close());

  test('returns identical nonempty connections through REST and GraphQL', async () => {
    const project = await createProject(ProjectStatus.ACTIVE);
    const snapshot = runSnapshot('run_transport', 'running');
    await prisma.projectRun.create({ data: { projectId: project.id, runId: snapshot.runId } });
    runtime.getRun.mockResolvedValue(snapshot);

    const rest = await request(app.getHttpServer())
      .get('/api/runs')
      .query({ projectId: project.id });
    const graphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'query($data: RunListInput!) { runs(data: $data) { edges { cursor node { runId projectId status } } totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } } }',
        variables: { data: { projectId: project.id } },
      });

    expect(rest.status).toBe(200);
    expect(graphql.body.errors).toBeUndefined();
    expect(graphql.body.data.runs).toMatchObject({
      totalCount: rest.body.totalCount,
      pageInfo: rest.body.pageInfo,
      edges: rest.body.edges.map((edge: { node: Record<string, unknown>; cursor: string }) => ({
        cursor: edge.cursor,
        node: {
          runId: edge.node.runId,
          projectId: edge.node.projectId,
          status: edge.node.status,
        },
      })),
    });
    expect(rest.body.edges[0].node).toMatchObject({
      runId: snapshot.runId,
      projectId: project.id,
      status: 'running',
    });
  });

  test.each([
    ['/api/runs', { projectId: undefined }, 'project_id_invalid', 'required', '/projectId'],
  ] as const)(
    'returns exact REST public errors for malformed required input',
    async (path, query, code, reason, errorPath) => {
      const response = await request(app.getHttpServer()).get(path).query(query);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code, path: errorPath, details: { reason } });
    },
  );

  test('rejects malformed REST pagination and statuses at the HTTP boundary', async () => {
    const project = await createProject(ProjectStatus.ACTIVE);
    const responses = await Promise.all(
      [
        { first: '0' },
        { first: '101' },
        { first: 'bad' },
        { after: 'bad' },
        { statuses: 'unknown' },
        { statuses: 'running,running' },
      ].map((query) =>
        request(app.getHttpServer())
          .get('/api/runs')
          .query({ projectId: project.id, ...query }),
      ),
    );
    responses.forEach((response) => {
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ statusCode: 400 });
      expect(response.body.message).toEqual(expect.any(String));
    });
    responses.slice(4).forEach((response) => {
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'run_statuses_invalid',
        message: RunErrorText.statusesInvalid,
        path: '/statuses',
        details: { reason: 'invalid_values' },
      });
    });
  });

  test('executes GraphQL validation and exposes the published list contract', async () => {
    const project = await createProject(ProjectStatus.ACTIVE);
    const responses = await Promise.all(
      [
        [{ data: { projectId: project.id, first: 0 } }, false],
        [{ data: { projectId: project.id, first: 101 } }, false],
        [{ data: { projectId: project.id, after: 'bad' } }, false],
        [{ data: { projectId: project.id, statuses: ['unknown'] } }, true],
        [{ data: { projectId: project.id, statuses: ['running', 'running'] } }, true],
      ].map((variables) =>
        request(app.getHttpServer()).post('/graphql').send({
          query: 'query($data: RunListInput!) { runs(data: $data) { totalCount } }',
          variables: variables[0],
        }),
      ),
    );
    responses.forEach((response, index) => {
      const error = response.body.errors?.[0];
      expect(error?.message).toEqual(expect.any(String));
      expect(error?.extensions ?? {}).toMatchObject(
        index >= 3
          ? {
              code: 'run_statuses_invalid',
              statusCode: 400,
              path: '/statuses',
              details: { reason: 'invalid_values' },
            }
          : {},
      );
    });
    const schema = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ __type(name: "RunConnection") { name } }' });
    expect(schema.body.data['__type']).toEqual({ name: 'RunConnection' });
  });

  test('rejects missing and non-integer GraphQL input through the published schema', async () => {
    const missing = await request(app.getHttpServer()).post('/graphql').send({
      query: 'query { runs(data: { first: 1 }) { totalCount } }',
    });
    const fractional = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'query($data: RunListInput!) { runs(data: $data) { totalCount } }',
        variables: { data: { projectId: 'missing', first: 1.5 } },
      });

    expect(missing.body.errors[0].message).toContain('projectId');
    expect(fractional.body.errors[0].message).toContain('Int cannot represent non-integer value');
  });

  test('paginates filtered results consistently through both transports', async () => {
    const project = await createProject(ProjectStatus.ACTIVE);
    const runIds = ['transport_a', 'transport_b', 'transport_c'];
    await prisma.projectRun.createMany({
      data: runIds.map((runId) => ({ projectId: project.id, runId })),
    });
    runtime.getRun.mockImplementation(async (runId) => runSnapshot(runId, 'running'));

    const restFirst = await request(app.getHttpServer())
      .get('/api/runs')
      .query({ projectId: project.id, first: 2, statuses: 'running' });
    const gqlFirst = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'query($data: RunListInput!) { runs(data: $data) { edges { cursor node { runId projectId status } } totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } } }',
        variables: { data: { projectId: project.id, first: 2, statuses: ['running'] } },
      });
    const restSecond = await request(app.getHttpServer()).get('/api/runs').query({
      projectId: project.id,
      first: 2,
      statuses: 'running',
      after: restFirst.body.pageInfo.endCursor,
    });
    const gqlSecond = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'query($data: RunListInput!) { runs(data: $data) { edges { cursor node { runId projectId status } } totalCount pageInfo { hasNextPage hasPreviousPage startCursor endCursor } } }',
        variables: {
          data: {
            projectId: project.id,
            first: 2,
            statuses: ['running'],
            after: gqlFirst.body.data.runs.pageInfo.endCursor,
          },
        },
      });

    expect(gqlFirst.body.data.runs.totalCount).toBe(restFirst.body.totalCount);
    expect(gqlFirst.body.data.runs.pageInfo).toEqual(restFirst.body.pageInfo);
    expect(
      gqlFirst.body.data.runs.edges.map(({ node }: { node: { runId: string } }) => node.runId),
    ).toEqual(restFirst.body.edges.map((edge: { node: { runId: string } }) => edge.node.runId));
    expect(gqlSecond.body.data.runs.totalCount).toBe(restSecond.body.totalCount);
    expect(gqlSecond.body.data.runs.pageInfo).toEqual(restSecond.body.pageInfo);
    expect(
      gqlSecond.body.data.runs.edges.map(({ node }: { node: { runId: string } }) => node.runId),
    ).toEqual(restSecond.body.edges.map((edge: { node: { runId: string } }) => edge.node.runId));
  });

  test('allows archived projects and rejects missing, system, and creating projects', async () => {
    const archived = await createProject(ProjectStatus.ARCHIVED);
    runtime.getRun.mockResolvedValue(runSnapshot('archived_run', 'succeeded'));
    await prisma.projectRun.create({ data: { projectId: archived.id, runId: 'archived_run' } });
    await request(app.getHttpServer())
      .get('/api/runs')
      .query({ projectId: archived.id })
      .expect(200);
    const archivedGraphql = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'query($data: RunListInput!) { runs(data: $data) { totalCount } }',
        variables: { data: { projectId: archived.id } },
      });
    expect(archivedGraphql.body.errors).toBeUndefined();
    expect(archivedGraphql.body.data.runs.totalCount).toBe(1);

    const system = await prisma.project.create({
      data: { name: 'System list', kind: ProjectKind.SYSTEM, status: ProjectStatus.ACTIVE },
    });
    projectIds.push(system.id);
    const creating = await createProject(ProjectStatus.CREATING);
    const responses = await Promise.all(
      ['missing', system.id, creating.id].map((projectId) =>
        request(app.getHttpServer()).get('/api/runs').query({ projectId }),
      ),
    );
    responses.forEach((response) => {
      expect(response.status).toBe(404);
    });
    const graphqlResponses = await Promise.all(
      ['missing', system.id, creating.id].map((projectId) =>
        request(app.getHttpServer())
          .post('/graphql')
          .send({
            query: 'query($data: RunListInput!) { runs(data: $data) { totalCount } }',
            variables: { data: { projectId } },
          }),
      ),
    );
    graphqlResponses.forEach((response) => {
      expect(response.body.errors).toHaveLength(1);
    });
  });

  async function createProject(status: ProjectStatus): Promise<{ id: string }> {
    const project = await prisma.project.create({
      data: { name: `Transport ${status}`, kind: ProjectKind.USER, status },
      select: { id: true },
    });
    projectIds.push(project.id);
    return project;
  }
});

function runSnapshot(runId: string, status: RunSnapshot['status']): RunSnapshot {
  const timestamp = '2024-01-01T00:00:00.000Z';
  return {
    schemaVersion: 'run-snapshot/v1',
    runId,
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
    terminal: null,
  };
}
