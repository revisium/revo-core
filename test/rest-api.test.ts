import { readFile } from 'node:fs/promises';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import packageJson from '../package.json' with { type: 'json' };
import { initSwagger } from '../src/api/rest/swagger.js';
import { AppModule } from '../src/app.module.js';
import { SYSTEM_PLAYBOOKS_PROJECT } from '../src/features/revisium-bootstrap/revisium-bootstrap.constants.js';
import { invalidPipeline, taskPipeline } from './fixtures/task-pipeline.js';

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
    for (const id of ids) {
      // oxlint-disable-next-line no-await-in-loop -- Delete one project at a time; cleanup is global.
      await request(app.getHttpServer()).delete(`/api/projects/${id}`);
    }
  });

  afterAll(async () => app.close());

  test('returns system information through CQRS', async () => {
    const response = await request(app.getHttpServer()).get('/api/system').expect(200);

    expect(response.body).toEqual({ name: 'revo-core', status: 'ok' });
  });

  test('starts and reads a durable run', async () => {
    const pipeline = taskPipeline();
    const input = { transport: 'rest' };
    const started = await request(app.getHttpServer())
      .post('/api/runs')
      .send({ pipeline, input })
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

    expect(snapshot).toMatchObject({ id: runId, input });
  });

  test('returns not found for an unknown run', async () => {
    const response = await request(app.getHttpServer()).get('/api/runs/missing-run');

    expect(response.status).toBe(404);
  });

  test('rejects an invalid pipeline', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/runs')
      .send({ pipeline: invalidPipeline(), input: null })
      .expect(400);

    expect(response.body).toMatchObject({ message: 'Pipeline definition is invalid.' });
  });

  test('creates, lists, gets, and deletes a USER project', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: '  Beta  ' })
      .expect(201);
    const project = created.body as { id: string; name: string };
    createdProjectIds.push(project.id);
    expect(project.name).toBe('Beta');

    const listed = await request(app.getHttpServer()).get('/api/projects?first=50').expect(200);
    const ids = listed.body.edges.map((edge: { node: { id: string } }) => edge.node.id);
    expect(ids).toContain(project.id);
    expect(ids).not.toContain(SYSTEM_PLAYBOOKS_PROJECT.id);

    const fetched = await request(app.getHttpServer())
      .get(`/api/projects/${project.id}`)
      .expect(200);
    expect(fetched.body).toEqual({ id: project.id, name: 'Beta' });

    await request(app.getHttpServer()).delete(`/api/projects/${project.id}`).expect(204);
    createdProjectIds.pop();

    await request(app.getHttpServer()).get(`/api/projects/${project.id}`).expect(404);
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
    expect(missing.body).toMatchObject({ message: 'Name is required.' });

    const nonString = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: 1 })
      .expect(400);
    expect(nonString.body).toMatchObject({ message: 'Name is required.' });
  });

  test('rejects a missing record id', async () => {
    const project = await createProject(app, createdProjectIds, 'Missing id');
    const response = await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/adrs`)
      .send({ title: 'First', status: 'proposed', context: 'Context', decision: 'Decision' })
      .expect(400);

    expect(response.body).toMatchObject({ message: 'Record id is required.' });
  });

  test('rejects an invalid project list page size', async () => {
    const zero = await request(app.getHttpServer()).get('/api/projects?first=0').expect(400);
    expect(zero.body).toMatchObject({ message: 'first must be between 1 and 100.' });

    const tooLarge = await request(app.getHttpServer()).get('/api/projects?first=101').expect(400);
    expect(tooLarge.body).toMatchObject({ message: 'first must be between 1 and 100.' });
  });

  test('hides the SYSTEM project from get and delete', async () => {
    const fetched = await request(app.getHttpServer()).get(
      `/api/projects/${SYSTEM_PLAYBOOKS_PROJECT.id}`,
    );
    expect(fetched.status).toBe(404);
    expect(fetched.body).toMatchObject({ message: 'Project was not found.' });

    const deleted = await request(app.getHttpServer()).delete(
      `/api/projects/${SYSTEM_PLAYBOOKS_PROJECT.id}`,
    );
    expect(deleted.status).toBe(404);
    expect(deleted.body).toMatchObject({ message: 'Project was not found.' });
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
        context: 'New',
        decision: 'Decision',
      })
      .expect(200);
    expect(updated.body).toMatchObject({ title: 'Updated', status: 'accepted', context: 'New' });

    await request(app.getHttpServer()).delete(`/api/projects/${project.id}/adrs/ADR-1`).expect(204);
    await request(app.getHttpServer()).get(`/api/projects/${project.id}/adrs/ADR-1`).expect(404);
  });

  test('rejects deleting an ADR that is still referenced', async () => {
    const project = await createProject(app, createdProjectIds, 'REST ref');
    await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/adrs`)
      .send(adrBody('ADR-1', 'Keep'))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/requirements`)
      .send({
        id: 'REQ-1',
        title: 'Needs ADR',
        status: 'proposed',
        statement: 'Must exist',
        acceptance: 'Pass',
        relatedAdr: ['ADR-1'],
      })
      .expect(201);

    const deleted = await request(app.getHttpServer())
      .delete(`/api/projects/${project.id}/adrs/ADR-1`)
      .expect(400);
    expect(deleted.body).toMatchObject({
      message: 'Cannot delete this record because other records still reference it.',
    });

    await request(app.getHttpServer()).get(`/api/projects/${project.id}/adrs/ADR-1`).expect(200);
  });

  test('does not treat same-id links to other tables as incoming ADR references', async () => {
    const project = await createProject(app, createdProjectIds, 'REST typed refs');
    await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/adrs`)
      .send(adrBody('X', 'Decision'))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/work-plans`)
      .send({
        id: 'X',
        title: 'Plan',
        status: 'draft',
        outcome: 'Done',
        bounds: 'This slice',
        acceptance: 'Accepted',
      })
      .expect(201);

    await request(app.getHttpServer()).delete(`/api/projects/${project.id}/adrs/X`).expect(204);

    await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/adrs`)
      .send(adrBody('X', 'Decision'))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/projects/${project.id}/requirements`)
      .send({
        id: 'REQ-X',
        title: 'Needs ADR',
        status: 'proposed',
        statement: 'Must exist',
        acceptance: 'Pass',
        relatedAdr: ['X'],
      })
      .expect(201);

    const blocked = await request(app.getHttpServer())
      .delete(`/api/projects/${project.id}/adrs/X`)
      .expect(400);
    expect(blocked.body).toMatchObject({
      message: 'Cannot delete this record because other records still reference it.',
    });
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

async function createProject(
  app: INestApplication,
  createdProjectIds: string[],
  name: string,
): Promise<{ id: string; name: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/projects')
    .send({ name })
    .expect(201);
  const project = response.body as { id: string; name: string };
  createdProjectIds.push(project.id);
  return project;
}

function adrBody(id: string, title: string) {
  return {
    id,
    title,
    status: 'proposed',
    context: 'Context',
    decision: 'Decision',
  };
}
