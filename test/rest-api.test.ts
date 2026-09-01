import { readFile } from 'node:fs/promises';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import packageJson from '../package.json' with { type: 'json' };
import { ProjectKind, ProjectStatus } from '../src/__generated__/client/enums.js';
import { initSwagger } from '../src/api/rest/swagger.js';
import { AppModule } from '../src/app.module.js';
import { SYSTEM_PLAYBOOKS_PROJECT } from '../src/features/revisium-bootstrap/revisium-bootstrap.constants.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { invalidPipeline, taskPipeline, taskProfile } from './fixtures/task-pipeline.js';

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('REST API', () => {
  let app: INestApplication;
  const createdProjectIds: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    initSwagger(app);
    await app.init();
  });

  afterEach(async () => {
    const ids = createdProjectIds.splice(0);

    if (ids.length === 0) {
      return;
    }

    const prisma = app.get(PrismaService);
    await prisma.$transaction([
      prisma.branch.deleteMany({ where: { projectId: { in: ids } } }),
      prisma.project.deleteMany({ where: { id: { in: ids } } }),
    ]);
  });

  afterAll(async () => app.close());

  test('returns system information through CQRS', async () => {
    const response = await request(app.getHttpServer()).get('/api/system').expect(200);

    expect(response.body).toEqual({ name: 'revo-core', status: 'ok' });
  });

  test('starts and reads a durable run', async () => {
    const pipeline = taskPipeline();
    const profile = taskProfile();
    const input = {};
    const started = await request(app.getHttpServer())
      .post('/api/runs')
      .send({ pipeline, profile, input })
      .expect(201);

    expect(started.body.runId).toEqual(expect.any(String));

    const runId = started.body.runId as string;
    let snapshot: Record<string, unknown> | undefined;

    await expect
      .poll(async () => {
        const response = await request(app.getHttpServer()).get(`/api/runs/${runId}`).expect(200);
        snapshot = response.body as Record<string, unknown>;
        return snapshot.status;
      })
      .toBe('succeeded');

    expect(snapshot).toMatchObject({ runId, status: 'succeeded' });
  });

  test('returns not found for an unknown run', async () => {
    const response = await request(app.getHttpServer()).get('/api/runs/missing-run');

    expect(response.status).toBe(404);
  });

  test('rejects an invalid pipeline', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/runs')
      .send({ pipeline: invalidPipeline(), profile: taskProfile(), input: null })
      .expect(422);

    expect(response.body).toMatchObject({
      statusCode: 422,
      code: 'pipeline_compilation_failed',
      message: 'Pipeline compilation failed.',
      path: null,
    });
  });

  test('creates, lists, and gets a USER project', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: '  Beta  ' })
      .expect(201);
    const { projectId } = created.body as { projectId: string };
    createdProjectIds.push(projectId);

    const listed = await request(app.getHttpServer()).get('/api/projects?first=50').expect(200);
    expect(projectIds(listed)).toContain(projectId);
    expect(projectIds(listed)).not.toContain(SYSTEM_PLAYBOOKS_PROJECT.id);

    const fetched = await request(app.getHttpServer())
      .get(`/api/projects/${projectId}`)
      .expect(200);
    expect(fetched.body).toEqual({
      id: projectId,
      name: 'Beta',
      description: '',
      status: 'active',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  test('names the project identifier id, without repeating the resource name', async () => {
    const project = await createProject(app, createdProjectIds, 'REST read model identifier');

    const fetched = await request(app.getHttpServer())
      .get(`/api/projects/${project.id}`)
      .expect(200);
    expect(fetched.body).toMatchObject({ id: project.id });
    expect(fetched.body).not.toHaveProperty('projectId');

    const listed = await request(app.getHttpServer())
      .get(`/api/projects?query=${project.id}`)
      .expect(200);
    expect(projectIds(listed)).toEqual([project.id]);
    expect(listed.body.edges[0].node).not.toHaveProperty('projectId');
  });

  test('offers no public project delete endpoint', async () => {
    const project = await createProject(app, createdProjectIds, 'REST no public delete');

    const removed = await request(app.getHttpServer()).delete(`/api/projects/${project.id}`);
    expect(removed.status).toBe(404);
    expect(removed.body).toMatchObject({
      message: `Cannot DELETE /api/projects/${project.id}`,
    });

    await request(app.getHttpServer()).get(`/api/projects/${project.id}`).expect(200);
  });

  test('archives a project over REST and reflects it in the read model', async () => {
    const project = await createProject(app, createdProjectIds, 'REST archive target');

    const archived = await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/archive`)
      .expect(204);
    expect(archived.headers['content-type']).toBeUndefined();

    const fetched = await request(app.getHttpServer())
      .get(`/api/projects/${project.id}`)
      .expect(200);
    expect(fetched.body).toMatchObject({ status: 'archived' });

    const listed = await request(app.getHttpServer())
      .get(`/api/projects?query=${project.id}`)
      .expect(200);
    expect(projectIds(listed)).not.toContain(project.id);

    const withArchived = await request(app.getHttpServer())
      .get(`/api/projects?query=${project.id}&includeArchived=true`)
      .expect(200);
    expect(projectIds(withArchived)).toEqual([project.id]);

    const repeated = await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/archive`)
      .expect(409);
    expect(repeated.body).toMatchObject({ message: 'Project is not active.' });
  });

  test('archiving an unknown project returns 404', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/projects/unknown-project-id/archive')
      .expect(404);

    expect(response.body).toMatchObject({ message: 'Project was not found.' });
  });

  test('returns the stored project timestamps as ISO strings', async () => {
    const project = await createProject(app, createdProjectIds, 'REST timestamps');
    const stored = await app.get(PrismaService).project.findUniqueOrThrow({
      where: { id: project.id },
      select: { createdAt: true, updatedAt: true },
    });

    const fetched = await request(app.getHttpServer())
      .get(`/api/projects/${project.id}`)
      .expect(200);

    const { createdAt, updatedAt } = fetched.body as { createdAt: string; updatedAt: string };
    expect(createdAt).toMatch(ISO_TIMESTAMP);
    expect(updatedAt).toMatch(ISO_TIMESTAMP);
    expect({ createdAt, updatedAt }).toEqual({
      createdAt: stored.createdAt.toISOString(),
      updatedAt: stored.updatedAt.toISOString(),
    });
  });

  test('repeats the project timestamps in the project list', async () => {
    const project = await createProject(app, createdProjectIds, 'REST listed timestamps');
    const stored = await app.get(PrismaService).project.findUniqueOrThrow({
      where: { id: project.id },
      select: { createdAt: true, updatedAt: true },
    });

    const listed = await request(app.getHttpServer())
      .get(`/api/projects?query=${project.id}`)
      .expect(200);

    expect(listed.body.edges).toEqual([
      {
        cursor: expect.any(String),
        node: expect.objectContaining({
          createdAt: stored.createdAt.toISOString(),
          updatedAt: stored.updatedAt.toISOString(),
        }),
      },
    ]);
  });

  test('rejects an empty project name', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: ' ' })
      .expect(400);

    expect(response.body).toMatchObject({ message: 'Name is required.' });
  });

  test('rejects a missing or non-string project name', async () => {
    const missing = await request(app.getHttpServer()).post('/api/projects').send({}).expect(400);
    expect(missing.body.message).toContain('Name is required.');

    const nonString = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 1 })
      .expect(400);
    expect(nonString.body.message).toContain('Name is required.');
  });

  test('rejects a missing record id', async () => {
    const project = await createProject(app, createdProjectIds, 'Missing id');
    const response = await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/adrs`)
      .send({ title: 'First', status: 'proposed', context: 'Context', decision: 'Decision' })
      .expect(400);

    expect(response.body.message).toContain('Record id is required.');
  });

  test('separates a malformed page size from an unsupported one', async () => {
    const project = await createProject(app, createdProjectIds, 'Page size guard');

    const malformed = await request(app.getHttpServer()).get('/api/projects?first=abc').expect(400);
    expect(malformed.body.message).toContain('numeric string is expected');

    const outOfRange = await request(app.getHttpServer())
      .get('/api/projects?first=101')
      .expect(400);
    expect(outOfRange.body).toMatchObject({
      message: 'The "first" parameter must be an integer between 1 and 100.',
    });

    const records = await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/work-items?first=abc`)
      .expect(400);
    expect(records.body.message).toContain('numeric string is expected');
  });

  test('rejects a non-boolean includeArchived flag', async () => {
    const numeric = await request(app.getHttpServer())
      .get('/api/projects?includeArchived=1')
      .expect(400);
    expect(numeric.body.message).toContain('boolean string is expected');

    await request(app.getHttpServer()).get('/api/projects?includeArchived=yes').expect(400);

    const accepted = await request(app.getHttpServer())
      .get('/api/projects?includeArchived=false')
      .expect(200);
    expect(accepted.body.edges).toEqual(expect.any(Array));
  });

  test('filters the project list by status and name', async () => {
    const active = await createProject(app, createdProjectIds, 'REST active filter');
    const archived = await createProject(app, createdProjectIds, 'REST archived filter');
    await app.get(PrismaService).project.update({
      where: { id: archived.id },
      data: { status: ProjectStatus.ARCHIVED },
    });

    const listed = await request(app.getHttpServer()).get('/api/projects').expect(200);
    expect(projectIds(listed)).toContain(active.id);
    expect(projectIds(listed)).not.toContain(archived.id);

    const withArchived = await request(app.getHttpServer())
      .get('/api/projects?includeArchived=true')
      .expect(200);
    expect(projectIds(withArchived)).toEqual(expect.arrayContaining([active.id, archived.id]));

    const searched = await request(app.getHttpServer())
      .get('/api/projects?query=archived%20filter&includeArchived=true')
      .expect(200);
    expect(projectIds(searched)).toEqual([archived.id]);
    expect(searched.body.totalCount).toBe(1);
  });

  test('lists the most recently changed project first', async () => {
    const stale = await createProject(app, createdProjectIds, 'REST recency stale');
    const recent = await createProject(app, createdProjectIds, 'REST recency recent');
    const freshest = await createProject(app, createdProjectIds, 'REST recency freshest');
    await setUpdatedAt(app, stale.id, '2026-04-01T00:00:00.000Z');
    await setUpdatedAt(app, recent.id, '2026-04-02T00:00:00.000Z');
    await setUpdatedAt(app, freshest.id, '2026-04-03T00:00:00.000Z');

    const listed = await request(app.getHttpServer()).get('/api/projects?first=50').expect(200);

    const created = new Set([stale.id, recent.id, freshest.id]);
    expect(
      listed.body.edges
        .map((edge: { node: ListedProject }) => edge.node)
        .filter((node: ListedProject) => created.has(node.id))
        .map((node: ListedProject) => ({ id: node.id, updatedAt: node.updatedAt })),
    ).toEqual([
      { id: freshest.id, updatedAt: '2026-04-03T00:00:00.000Z' },
      { id: recent.id, updatedAt: '2026-04-02T00:00:00.000Z' },
      { id: stale.id, updatedAt: '2026-04-01T00:00:00.000Z' },
    ]);
  });

  test('keeps the recency order while searching and while including archived', async () => {
    const stale = await createProject(app, createdProjectIds, 'REST recency filter stale');
    const archived = await createProject(app, createdProjectIds, 'REST recency filter archived');
    const active = await createProject(app, createdProjectIds, 'REST recency filter active');
    await app.get(PrismaService).project.update({
      where: { id: archived.id },
      data: { status: ProjectStatus.ARCHIVED, updatedAt: '2026-05-02T00:00:00.000Z' },
    });
    await setUpdatedAt(app, stale.id, '2026-05-01T00:00:00.000Z');
    await setUpdatedAt(app, active.id, '2026-05-03T00:00:00.000Z');

    const searched = await request(app.getHttpServer())
      .get('/api/projects?query=REST%20recency%20filter')
      .expect(200);

    expect(listedIds(searched.body)).toEqual([active.id, stale.id]);

    const withArchived = await request(app.getHttpServer())
      .get('/api/projects?query=REST%20recency%20filter&includeArchived=true')
      .expect(200);

    expect(listedIds(withArchived.body)).toEqual([active.id, archived.id, stale.id]);
    expect(withArchived.body.totalCount).toBe(3);
  });

  test('breaks an updatedAt tie by id and holds that order across pages', async () => {
    const recentTie = '2026-06-02T00:00:00.000Z';
    const staleTie = '2026-06-01T00:00:00.000Z';
    const seeded = [
      'rest-recency-tie-recent-a',
      'rest-recency-tie-recent-b',
      'rest-recency-tie-stale-a',
      'rest-recency-tie-stale-b',
    ];

    // Seeded in the reverse of id-ascending order on purpose. Postgres sorts a tie
    // group this small with a stable insertion sort, so it falls back to insertion
    // order whenever the id tie-breaker is missing. Reversing it here makes a
    // dropped tie-breaker fail every run instead of three runs in four.
    await seedProject(app, 'rest-recency-tie-recent-b', recentTie);
    await seedProject(app, 'rest-recency-tie-recent-a', recentTie);
    await seedProject(app, 'rest-recency-tie-stale-b', staleTie);
    await seedProject(app, 'rest-recency-tie-stale-a', staleTie);

    try {
      const expected = [
        ...(await idsAscending(app, ['rest-recency-tie-recent-a', 'rest-recency-tie-recent-b'])),
        ...(await idsAscending(app, ['rest-recency-tie-stale-a', 'rest-recency-tie-stale-b'])),
      ];
      const listPage = '/api/projects?first=2&query=rest-recency-tie';

      const page = await request(app.getHttpServer()).get(listPage).expect(200);

      expect(page.body.totalCount).toBe(4);
      expect(page.body.pageInfo.hasNextPage).toBe(true);
      expect(listedIds(page.body)).toEqual(expected.slice(0, 2));

      const next = await request(app.getHttpServer())
        .get(`${listPage}&after=${page.body.pageInfo.endCursor}`)
        .expect(200);

      expect(next.body.pageInfo.hasNextPage).toBe(false);
      expect(listedIds(next.body)).toEqual(expected.slice(2));
      expect([...listedIds(page.body), ...listedIds(next.body)]).toEqual(expected);
    } finally {
      await app.get(PrismaService).project.deleteMany({ where: { id: { in: seeded } } });
    }
  });

  test('rejects an invalid project list page size', async () => {
    const negative = await request(app.getHttpServer()).get('/api/projects?first=-1').expect(400);
    expect(negative.body).toMatchObject({
      message: 'The "first" parameter must be an integer between 1 and 100.',
    });

    const after = await request(app.getHttpServer())
      .get('/api/projects?first=1&after=abc')
      .expect(400);
    expect(after.body).toMatchObject({
      message: 'The "after" cursor does not come from this list.',
    });
  });

  test('hides the SYSTEM project from get', async () => {
    const fetched = await request(app.getHttpServer()).get(
      `/api/projects/${SYSTEM_PLAYBOOKS_PROJECT.id}`,
    );

    expect(fetched.status).toBe(404);
    expect(fetched.body).toMatchObject({ message: 'Project was not found.' });
  });

  test('returns empty record connections after create', async () => {
    const project = await createProject(app, createdProjectIds, 'Empty rest');

    const adrs = await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/adrs?first=10`)
      .expect(200);
    expect(adrs.body).toMatchObject({ totalCount: 0, edges: [] });

    const requirements = await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/requirements?first=10`)
      .expect(200);
    expect(requirements.body.totalCount).toBe(0);

    const workPlans = await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/work-plans?first=10`)
      .expect(200);
    expect(workPlans.body.totalCount).toBe(0);

    const workItems = await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/work-items?first=10`)
      .expect(200);
    expect(workItems.body.totalCount).toBe(0);
  });

  test('creates, gets, lists, updates, and deletes an ADR', async () => {
    const project = await createProject(app, createdProjectIds, 'REST ADR');
    const created = await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/adrs`)
      .send(adrBody('ADR-1', 'First'))
      .expect(201);
    expect(created.body).toMatchObject({ id: 'ADR-1', title: 'First', status: 'proposed' });

    const fetched = await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/adrs/ADR-1`)
      .expect(200);
    expect(fetched.body.id).toBe('ADR-1');

    const listed = await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/adrs?first=10`)
      .expect(200);
    expect(listed.body).toMatchObject({
      totalCount: 1,
      edges: [{ node: { id: 'ADR-1' } }],
    });

    const updated = await request(app.getHttpServer())
      .put(`/api/projects/${project.id}/adrs/ADR-1`)
      .send({
        title: 'Updated',
        status: 'accepted',
        supersededBy: '',
        context: 'New',
        decision: 'Decision',
        alternatives: [],
        consequences: '',
        relatedRequirements: [],
      })
      .expect(200);
    expect(updated.body).toMatchObject({ title: 'Updated', status: 'accepted', context: 'New' });

    await request(app.getHttpServer()).delete(`/api/projects/${project.id}/adrs/ADR-1`).expect(204);
    await request(app.getHttpServer()).get(`/api/projects/${project.id}/adrs/ADR-1`).expect(404);
  });

  test('creates and gets Requirement, WorkPlan, and WorkItem', async () => {
    const project = await createProject(app, createdProjectIds, 'REST smoke');

    const requirement = await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/requirements`)
      .send({
        id: 'REQ-2',
        title: 'Need auth',
        status: 'accepted',
        statement: 'Users sign in',
        acceptance: 'Login works',
        relatedAdr: [],
      })
      .expect(201);
    expect(requirement.body).toMatchObject({ id: 'REQ-2' });

    const workPlan = await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/work-plans`)
      .send({
        id: 'WP-2',
        title: 'Plan',
        status: 'draft',
        outcome: 'Done',
        bounds: 'This slice',
        baselineId: '',
        acceptance: 'Accepted',
      })
      .expect(201);
    expect(workPlan.body).toMatchObject({ id: 'WP-2' });

    const workItem = await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/work-items`)
      .send({
        id: 'WI-2',
        title: 'Item',
        cancelled: false,
        goal: 'Ship',
        inputs: 'Spec',
        owner: 'owner-1',
        constraints: 'Time',
        acceptance: 'Done',
        plan: 'WP-2',
        dependsOn: [],
        relatedRequirements: [],
        relatedAdr: [],
      })
      .expect(201);
    expect(workItem.body).toMatchObject({ id: 'WI-2', plan: 'WP-2' });

    await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/requirements/REQ-2`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/work-plans/WP-2`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/projects/${project.id}/work-items/WI-2`)
      .expect(200);
  });

  test('isolates records from another USER project', async () => {
    const first = await createProject(app, createdProjectIds, 'REST first');
    const second = await createProject(app, createdProjectIds, 'REST second');
    await request(app.getHttpServer())
      .post(`/api/projects/${first.id}/adrs`)
      .send(adrBody('ADR-A', 'A'))
      .expect(201);

    const missing = await request(app.getHttpServer()).get(`/api/projects/${second.id}/adrs/ADR-A`);
    expect(missing.status).toBe(404);
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

function projectIds(response: { body: { edges: { node: { id: string } }[] } }): string[] {
  return response.body.edges.map((edge) => edge.node.id);
}

async function createProject(
  app: INestApplication,
  createdProjectIds: string[],
  name: string,
): Promise<{ id: string; name: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/projects')
    .send({ name })
    .expect(201);
  const { projectId } = response.body as { projectId: string };
  createdProjectIds.push(projectId);
  return { id: projectId, name };
}

type ListedProject = { id: string; updatedAt: string };

function listedIds(body: { edges: { node: ListedProject }[] }): string[] {
  return body.edges.map((edge) => edge.node.id);
}

async function seedProject(app: INestApplication, id: string, updatedAt: string): Promise<void> {
  await app.get(PrismaService).project.create({
    data: { id, name: id, kind: ProjectKind.USER, status: ProjectStatus.ACTIVE, updatedAt },
  });
}

async function setUpdatedAt(app: INestApplication, id: string, updatedAt: string): Promise<void> {
  await app.get(PrismaService).project.update({ where: { id }, data: { updatedAt } });
}

async function idsAscending(app: INestApplication, ids: string[]): Promise<string[]> {
  const projects = await app.get(PrismaService).project.findMany({
    where: { id: { in: ids } },
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  return projects.map((project) => project.id);
}

function adrBody(id: string, title: string) {
  return {
    id,
    title,
    status: 'proposed',
    supersededBy: '',
    context: 'Context',
    decision: 'Decision',
    alternatives: [],
    consequences: '',
    relatedRequirements: [],
  };
}
