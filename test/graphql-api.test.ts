import { readFile } from 'node:fs/promises';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
  type IntrospectionQuery,
} from 'graphql';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import { ProjectKind, ProjectStatus } from '../src/__generated__/client/enums.js';
import { AppModule } from '../src/app.module.js';
import { SYSTEM_PLAYBOOKS_PROJECT } from '../src/features/revisium-bootstrap/revisium-bootstrap.constants.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { taskPipeline, taskProfile } from './fixtures/task-pipeline.js';

describe('GraphQL API', () => {
  let app: INestApplication;
  const createdProjectIds: string[] = [];

  beforeAll(async () => {
    app = await startApp();
  });

  afterEach(async () => {
    const ids = createdProjectIds.splice(0);
    for (const id of ids) {
      // oxlint-disable-next-line no-await-in-loop -- Delete one project at a time; cleanup is global.
      await graphql(app, DELETE_PROJECT, { id });
    }
  });

  afterAll(async () => app.close());

  test('returns system information through CQRS', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: 'query { systemInfo { name status } }' })
      .expect(200);

    expect(response.body).toEqual({
      data: { systemInfo: { name: 'revo-core', status: 'ok' } },
    });
  });

  test('starts and reads a durable run', async () => {
    const pipeline = taskPipeline();
    const profile = taskProfile();
    const input = {};
    const started = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation StartRun($data: StartRunInput!) {
            startRun(data: $data) { runId }
          }
        `,
        variables: { data: { pipeline, profile, input } },
      })
      .expect(200);

    expect(started.body.errors).toBeUndefined();
    const runId = started.body.data.startRun.runId as string;
    let snapshot: Record<string, unknown> | undefined;

    await expect
      .poll(async () => {
        const response = await request(app.getHttpServer())
          .post('/graphql')
          .send({
            query: `
              query Run($id: ID!) {
                run(id: $id) { runId status terminal }
              }
            `,
            variables: { id: runId },
          })
          .expect(200);
        snapshot = response.body.data.run as Record<string, unknown>;
        return snapshot.status;
      })
      .toBe('succeeded');

    expect(snapshot).toMatchObject({ runId, status: 'succeeded' });
  });

  test('returns null for an unknown run', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: 'query { run(id: "missing-run") { runId } }' })
      .expect(200);

    expect(response.body).toEqual({ data: { run: null } });
  });

  test('creates, lists, gets, and deletes a USER project', async () => {
    const created = await graphql(app, CREATE_PROJECT, { data: { name: '  Alpha  ' } });
    expect(created.body.errors).toBeUndefined();
    const { projectId } = created.body.data.createProject as { projectId: string };
    createdProjectIds.push(projectId);

    const listed = await graphql(app, LIST_PROJECTS, { data: { first: 50 } });
    expect(listed.body.errors).toBeUndefined();
    const ids = listed.body.data.projects.edges.map(
      (edge: { node: { id: string } }) => edge.node.id,
    );
    expect(ids).toContain(projectId);
    expect(ids).not.toContain(SYSTEM_PLAYBOOKS_PROJECT.id);

    const fetched = await graphql(app, GET_PROJECT, { id: projectId });
    expect(fetched.body).toMatchObject({
      data: { project: { id: projectId, name: 'Alpha' } },
    });

    const deleted = await graphql(app, DELETE_PROJECT, { id: projectId });
    expect(deleted.body).toEqual({ data: { deleteProject: true } });
    createdProjectIds.pop();

    const missing = await graphql(app, GET_PROJECT, { id: projectId });
    expect(missing.body).toEqual({ data: { project: null } });
  });

  test('rejects an empty project name and does not create a project', async () => {
    const before = await graphql(app, LIST_PROJECTS, { data: { first: 50 } });
    const beforeCount = before.body.data.projects.totalCount as number;

    const empty = await graphql(app, CREATE_PROJECT, { data: { name: '   ' } });
    expect(empty.body.data).toBeNull();
    expect(empty.body.errors[0].message).toBe('Name is required.');

    const after = await graphql(app, LIST_PROJECTS, { data: { first: 50 } });
    expect(after.body.data.projects.totalCount).toBe(beforeCount);
  });

  test('creates a project without a description as active and empty', async () => {
    const created = await graphql(app, CREATE_PROJECT, { data: { name: 'No description' } });
    expect(created.body.errors).toBeUndefined();
    const { projectId } = created.body.data.createProject as { projectId: string };
    createdProjectIds.push(projectId);

    const fetched = await graphql(app, GET_PROJECT, { id: projectId });
    expect(fetched.body.data.project).toMatchObject({ description: '', status: 'active' });
  });

  test('stores the description passed to createProject', async () => {
    const description = 'Keeps the product intent next to the name.';
    const created = await graphql(app, CREATE_PROJECT, {
      data: { name: 'With description', description },
    });
    expect(created.body.errors).toBeUndefined();
    const { projectId } = created.body.data.createProject as { projectId: string };
    createdProjectIds.push(projectId);

    const fetched = await graphql(app, GET_PROJECT, { id: projectId });
    expect(fetched.body.data.project).toMatchObject({ description, status: 'active' });
  });

  test('rejects a null description and does not create a project', async () => {
    const before = await graphql(app, LIST_PROJECTS, { data: { first: 50 } });
    const beforeCount = before.body.data.projects.totalCount as number;

    const invalid = await graphql(app, CREATE_PROJECT, {
      data: { name: 'Null description', description: null },
    });
    expect(invalid.body.data).toBeNull();
    expect(invalid.body.errors[0].message).toBe('Description must be a string.');

    const after = await graphql(app, LIST_PROJECTS, { data: { first: 50 } });
    expect(after.body.data.projects.totalCount).toBe(beforeCount);
  });

  test('reads a project stored before the description and status columns', async () => {
    const prisma = app.get(PrismaService);
    const legacyId = 'legacy_project_without_description';
    await prisma.project.create({
      data: {
        id: legacyId,
        name: 'Legacy project',
        kind: ProjectKind.USER,
        status: ProjectStatus.ACTIVE,
      },
    });

    try {
      const fetched = await graphql(app, GET_PROJECT, { id: legacyId });

      expect(fetched.body.errors).toBeUndefined();
      expect(fetched.body.data.project).toMatchObject({
        id: legacyId,
        description: '',
        status: 'active',
      });
    } finally {
      await prisma.project.delete({ where: { id: legacyId } });
    }
  });

  test('hides archived projects unless they are asked for', async () => {
    const active = await createProject(app, createdProjectIds, 'Filter active');
    const archived = await createProject(app, createdProjectIds, 'Filter archived');
    await app.get(PrismaService).project.update({
      where: { id: archived.id },
      data: { status: ProjectStatus.ARCHIVED },
    });

    const listed = await graphql(app, LIST_PROJECTS, { data: { first: 50 } });
    expect(listed.body.errors).toBeUndefined();
    expect(projectIds(listed)).toContain(active.id);
    expect(projectIds(listed)).not.toContain(archived.id);

    const withArchived = await graphql(app, LIST_PROJECTS, {
      data: { first: 50, includeArchived: true },
    });
    expect(projectIds(withArchived)).toEqual(expect.arrayContaining([active.id, archived.id]));
    expect(
      withArchived.body.data.projects.edges.find(
        (edge: { node: { id: string } }) => edge.node.id === archived.id,
      ).node.status,
    ).toBe('archived');
  });

  test('searches by a name fragment and by the exact project id', async () => {
    const project = await createProject(app, createdProjectIds, 'Searchable orchestration');
    await createProject(app, createdProjectIds, 'Unrelated');

    const byFragment = await graphql(app, LIST_PROJECTS, {
      data: { first: 50, query: 'chestra' },
    });
    expect(byFragment.body.errors).toBeUndefined();
    expect(projectIds(byFragment)).toEqual([project.id]);
    expect(byFragment.body.data.projects.totalCount).toBe(1);

    const byId = await graphql(app, LIST_PROJECTS, { data: { first: 50, query: project.id } });
    expect(projectIds(byId)).toEqual([project.id]);
  });

  test('returns an empty page when the search matches nothing', async () => {
    const empty = await graphql(app, LIST_PROJECTS, {
      data: { first: 50, query: 'no-such-project-anywhere' },
    });

    expect(empty.body.errors).toBeUndefined();
    expect(empty.body.data.projects.edges).toEqual([]);
    expect(empty.body.data.projects.totalCount).toBe(0);
  });

  test('rejects a page size outside the supported range', async () => {
    const tooLarge = await graphql(app, LIST_PROJECTS, { data: { first: 101 } });
    expect(tooLarge.body.data).toBeNull();
    expect(tooLarge.body.errors[0].message).toBe(
      'The "first" parameter must be an integer between 1 and 100.',
    );

    const zero = await graphql(app, LIST_PROJECTS, { data: { first: 0 } });
    expect(zero.body.data).toBeNull();
    expect(zero.body.errors[0].message).toBe(
      'The "first" parameter must be an integer between 1 and 100.',
    );
  });

  test('falls back to a full page when first is omitted', async () => {
    const project = await createProject(app, createdProjectIds, 'Default page size');

    const listed = await graphql(app, LIST_PROJECTS, { data: {} });

    expect(listed.body.errors).toBeUndefined();
    expect(projectIds(listed)).toContain(project.id);
  });

  test('hides the SYSTEM project from get, list, and delete', async () => {
    const fetched = await graphql(app, GET_PROJECT, { id: SYSTEM_PLAYBOOKS_PROJECT.id });
    expect(fetched.body).toEqual({ data: { project: null } });

    const deleted = await graphql(app, DELETE_PROJECT, { id: SYSTEM_PLAYBOOKS_PROJECT.id });
    expect(deleted.body.data).toBeNull();
    expect(deleted.body.errors[0].message).toBe('Project was not found.');
  });

  test('returns empty record connections after create', async () => {
    const project = await createProject(app, createdProjectIds, 'Empty records');
    const fetched = await graphql(app, GET_PROJECT_RECORDS, { id: project.id });

    expect(fetched.body.errors).toBeUndefined();
    expect(fetched.body.data.project).toMatchObject({
      adrs: { totalCount: 0, edges: [] },
      requirements: { totalCount: 0, edges: [] },
      workPlans: { totalCount: 0, edges: [] },
      workItems: { totalCount: 0, edges: [] },
    });
  });

  test('creates, gets, lists, updates, and deletes an ADR', async () => {
    const project = await createProject(app, createdProjectIds, 'ADR path');
    const created = await graphql(app, CREATE_ADR, {
      data: adrInput(project.id, 'ADR-1', 'First decision'),
    });
    expect(created.body.errors).toBeUndefined();
    expect(created.body.data.createAdr).toMatchObject({
      id: 'ADR-1',
      title: 'First decision',
      status: 'proposed',
    });

    const fetched = await graphql(app, GET_ADR, { projectId: project.id, id: 'ADR-1' });
    expect(fetched.body.data.project.adr).toMatchObject({
      id: 'ADR-1',
      title: 'First decision',
    });

    const listed = await graphql(app, LIST_ADRS, { projectId: project.id, data: { first: 10 } });
    expect(listed.body.data.project.adrs).toMatchObject({
      totalCount: 1,
      edges: [{ node: { id: 'ADR-1' } }],
    });

    const updated = await graphql(app, UPDATE_ADR, {
      data: {
        ...adrInput(project.id, 'ADR-1', 'Updated decision'),
        status: 'accepted',
        context: 'New context',
      },
    });
    expect(updated.body.data.updateAdr).toMatchObject({
      title: 'Updated decision',
      status: 'accepted',
      context: 'New context',
    });

    const deleted = await graphql(app, DELETE_ADR, {
      data: { projectId: project.id, id: 'ADR-1' },
    });
    expect(deleted.body).toEqual({ data: { deleteAdr: true } });

    const missing = await graphql(app, GET_ADR, { projectId: project.id, id: 'ADR-1' });
    expect(missing.body.data.project.adr).toBeNull();
  });

  test('rejects an invalid project list page size', async () => {
    const listed = await graphql(app, LIST_PROJECTS, { data: { first: -1 } });
    expect(listed.body.data).toBeNull();
    expect(listed.body.errors[0].message).toBe(
      'The "first" parameter must be an integer between 1 and 100.',
    );

    const after = await graphql(app, LIST_PROJECTS, { data: { first: 1, after: 'abc' } });
    expect(after.body.data).toBeNull();
    expect(after.body.errors[0].message).toBe(
      'Invalid "after" cursor: must be a non-negative integer string',
    );
  });

  test('paginates USER projects and ADRs through GraphQL', async () => {
    const project = await createProject(app, createdProjectIds, 'Page A');
    await createProject(app, createdProjectIds, 'Page B');
    await graphql(app, CREATE_ADR, { data: adrInput(project.id, 'ADR-1', 'One') });
    await graphql(app, CREATE_ADR, { data: adrInput(project.id, 'ADR-2', 'Two') });

    const firstProjects = await graphql(app, LIST_PROJECTS, { data: { first: 1 } });
    expect(firstProjects.body.errors).toBeUndefined();
    expect(firstProjects.body.data.projects.edges).toHaveLength(1);
    expect(firstProjects.body.data.projects.totalCount).toBeGreaterThanOrEqual(2);
    expect(firstProjects.body.data.projects.pageInfo.hasNextPage).toBe(true);
    expect(firstProjects.body.data.projects.pageInfo.hasPreviousPage).toBe(false);
    expect(firstProjects.body.data.projects.pageInfo.endCursor).toEqual(expect.any(String));

    const nextProjects = await graphql(app, LIST_PROJECTS, {
      data: { first: 1, after: firstProjects.body.data.projects.pageInfo.endCursor },
    });
    expect(nextProjects.body.errors).toBeUndefined();
    expect(nextProjects.body.data.projects.edges).toHaveLength(1);
    expect(nextProjects.body.data.projects.edges[0].node.id).not.toBe(
      firstProjects.body.data.projects.edges[0].node.id,
    );
    expect(nextProjects.body.data.projects.pageInfo.hasPreviousPage).toBe(true);

    const firstAdrs = await graphql(app, LIST_ADRS, {
      projectId: project.id,
      data: { first: 1 },
    });
    expect(firstAdrs.body.errors).toBeUndefined();
    expect(firstAdrs.body.data.project.adrs).toMatchObject({
      totalCount: 2,
      pageInfo: { hasNextPage: true },
    });
    expect(firstAdrs.body.data.project.adrs.edges).toHaveLength(1);
    expect(firstAdrs.body.data.project.adrs.pageInfo.endCursor).toEqual(expect.any(String));

    const nextAdrs = await graphql(app, LIST_ADRS, {
      projectId: project.id,
      data: { first: 1, after: firstAdrs.body.data.project.adrs.pageInfo.endCursor },
    });
    expect(nextAdrs.body.errors).toBeUndefined();
    expect(nextAdrs.body.data.project.adrs.edges).toHaveLength(1);
    expect(nextAdrs.body.data.project.adrs.edges[0].node.id).not.toBe(
      firstAdrs.body.data.project.adrs.edges[0].node.id,
    );
    expect(
      [
        firstAdrs.body.data.project.adrs.edges[0].node.id,
        nextAdrs.body.data.project.adrs.edges[0].node.id,
      ].toSorted((left: string, right: string) => left.localeCompare(right)),
    ).toEqual(['ADR-1', 'ADR-2']);
    expect(nextAdrs.body.data.project.adrs.pageInfo.hasPreviousPage).toBe(true);
    expect(nextAdrs.body.data.project.adrs.pageInfo.hasNextPage).toBe(false);
  });

  test('creates and gets Requirement, WorkPlan, and WorkItem', async () => {
    const project = await createProject(app, createdProjectIds, 'Record smoke');

    const requirement = await graphql(app, CREATE_REQUIREMENT, {
      data: {
        projectId: project.id,
        id: 'REQ-9',
        title: 'Need auth',
        status: 'accepted',
        statement: 'Users sign in',
        acceptance: 'Login works',
        relatedAdr: [],
      },
    });
    expect(requirement.body.data.createRequirement).toMatchObject({
      id: 'REQ-9',
      title: 'Need auth',
    });

    const workPlan = await graphql(app, CREATE_WORK_PLAN, {
      data: {
        projectId: project.id,
        id: 'WP-1',
        title: 'Plan',
        status: 'draft',
        outcome: 'Done',
        bounds: 'This slice',
        baselineId: '',
        acceptance: 'Accepted',
      },
    });
    expect(workPlan.body.data.createWorkPlan).toMatchObject({ id: 'WP-1', title: 'Plan' });

    const workItem = await graphql(app, CREATE_WORK_ITEM, {
      data: {
        projectId: project.id,
        id: 'WI-1',
        title: 'Item',
        cancelled: false,
        goal: 'Ship',
        inputs: 'Spec',
        owner: 'owner-1',
        constraints: 'Time',
        acceptance: 'Done',
        plan: 'WP-1',
        dependsOn: [],
        relatedRequirements: [],
        relatedAdr: [],
      },
    });
    expect(workItem.body.data.createWorkItem).toMatchObject({
      id: 'WI-1',
      plan: 'WP-1',
    });

    const fetched = await graphql(app, GET_RECORD_SMOKE, {
      projectId: project.id,
      requirementId: 'REQ-9',
      workPlanId: 'WP-1',
      workItemId: 'WI-1',
    });
    expect(fetched.body.data.project).toMatchObject({
      requirement: { id: 'REQ-9' },
      workPlan: { id: 'WP-1' },
      workItem: { id: 'WI-1' },
    });

    await graphql(app, CREATE_REQUIREMENT, {
      data: {
        projectId: project.id,
        id: 'REQ-10',
        title: 'Need sessions',
        status: 'accepted',
        statement: 'Users stay signed in',
        acceptance: 'Session works',
        relatedAdr: [],
      },
    });

    const firstRequirements = await graphql(app, LIST_RECORDS, {
      projectId: project.id,
      data: { first: 1 },
    });
    expect(firstRequirements.body.errors).toBeUndefined();
    expect(firstRequirements.body.data.project.requirements.totalCount).toBe(2);
    expect(firstRequirements.body.data.project.requirements.pageInfo.hasNextPage).toBe(true);

    const nextRequirements = await graphql(app, LIST_RECORDS, {
      projectId: project.id,
      data: {
        first: 1,
        after: firstRequirements.body.data.project.requirements.pageInfo.endCursor,
      },
    });
    expect(nextRequirements.body.data.project.requirements.edges).toHaveLength(1);
    expect(nextRequirements.body.data.project.requirements.edges[0].node.id).not.toBe(
      firstRequirements.body.data.project.requirements.edges[0].node.id,
    );

    const firstPlans = await graphql(app, LIST_RECORDS, {
      projectId: project.id,
      data: { first: 1 },
    });
    const nextPlans = await graphql(app, LIST_RECORDS, {
      projectId: project.id,
      data: { first: 1, after: firstPlans.body.data.project.workPlans.pageInfo.endCursor },
    });
    expect(nextPlans.body.data.project.workPlans.edges).toHaveLength(0);

    const firstItems = await graphql(app, LIST_RECORDS, {
      projectId: project.id,
      data: { first: 1 },
    });
    const nextItems = await graphql(app, LIST_RECORDS, {
      projectId: project.id,
      data: { first: 1, after: firstItems.body.data.project.workItems.pageInfo.endCursor },
    });
    expect(nextItems.body.data.project.workItems.edges).toHaveLength(0);

    const updatedRequirement = await graphql(app, UPDATE_REQUIREMENT, {
      data: {
        projectId: project.id,
        id: 'REQ-9',
        title: 'Need auth now',
        status: 'accepted',
        statement: 'Users sign in',
        acceptance: 'Login works',
        relatedAdr: [],
      },
    });
    expect(updatedRequirement.body.data.updateRequirement.title).toBe('Need auth now');

    const updatedPlan = await graphql(app, UPDATE_WORK_PLAN, {
      data: {
        projectId: project.id,
        id: 'WP-1',
        title: 'Updated plan',
        status: 'draft',
        outcome: 'Done',
        bounds: 'This slice',
        baselineId: '',
        acceptance: 'Accepted',
      },
    });
    expect(updatedPlan.body.data.updateWorkPlan.title).toBe('Updated plan');

    const updatedItem = await graphql(app, UPDATE_WORK_ITEM, {
      data: {
        projectId: project.id,
        id: 'WI-1',
        title: 'Updated item',
        cancelled: false,
        goal: 'Ship',
        inputs: 'Spec',
        owner: 'owner-1',
        constraints: 'Time',
        acceptance: 'Done',
        plan: 'WP-1',
        dependsOn: [],
        relatedRequirements: [],
        relatedAdr: [],
      },
    });
    expect(updatedItem.body.data.updateWorkItem.title).toBe('Updated item');

    expect(
      (await graphql(app, DELETE_REQUIREMENT, { data: { projectId: project.id, id: 'REQ-9' } }))
        .body.data.deleteRequirement,
    ).toBe(true);
    expect(
      (await graphql(app, DELETE_WORK_ITEM, { data: { projectId: project.id, id: 'WI-1' } })).body
        .data.deleteWorkItem,
    ).toBe(true);
    expect(
      (await graphql(app, DELETE_WORK_PLAN, { data: { projectId: project.id, id: 'WP-1' } })).body
        .data.deleteWorkPlan,
    ).toBe(true);
  });

  test('isolates records from system_playbooks and another USER project', async () => {
    const first = await createProject(app, createdProjectIds, 'First');
    const second = await createProject(app, createdProjectIds, 'Second');
    await graphql(app, CREATE_ADR, { data: adrInput(first.id, 'ADR-A', 'A') });
    await graphql(app, CREATE_ADR, { data: adrInput(second.id, 'ADR-B', 'B') });

    const firstHasB = await graphql(app, GET_ADR, { projectId: first.id, id: 'ADR-B' });
    expect(firstHasB.body.data.project.adr).toBeNull();

    const secondHasA = await graphql(app, GET_ADR, { projectId: second.id, id: 'ADR-A' });
    expect(secondHasA.body.data.project.adr).toBeNull();

    const systemProject = await graphql(app, GET_PROJECT, { id: SYSTEM_PLAYBOOKS_PROJECT.id });
    expect(systemProject.body.data.project).toBeNull();
  });

  test('applies content-model migrations again after restart', async () => {
    const project = await createProject(app, createdProjectIds, 'Restart');
    await app.close();
    app = await startApp();

    const fetched = await graphql(app, GET_PROJECT_RECORDS, { id: project.id });
    expect(fetched.body.errors).toBeUndefined();
    expect(fetched.body.data.project.adrs.totalCount).toBe(0);

    const created = await graphql(app, CREATE_ADR, {
      data: adrInput(project.id, 'ADR-R', 'After restart'),
    });
    expect(created.body.errors).toBeUndefined();
    expect(created.body.data.createAdr.id).toBe('ADR-R');
  });

  test('matches the committed schema', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: getIntrospectionQuery() })
      .expect(200);
    const actual = printSchema(buildClientSchema(response.body.data as IntrospectionQuery)).trim();
    const expected = (
      await readFile(new URL('../src/api/graphql/schema.graphql', import.meta.url), 'utf8')
    ).trim();

    expect(actual).toBe(expected);
  });
});

const CREATE_PROJECT = `
  mutation CreateProject($data: ProjectCreateInput!) {
    createProject(data: $data) { projectId }
  }
`;

const LIST_PROJECTS = `
  query Projects($data: ProjectListInput!) {
    projects(data: $data) {
      totalCount
      edges { cursor node { id name description status } }
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
    }
  }
`;

const GET_PROJECT = `
  query Project($id: ID!) {
    project(id: $id) { id name description status }
  }
`;

const DELETE_PROJECT = `
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

const GET_PROJECT_RECORDS = `
  query ProjectRecords($id: ID!) {
    project(id: $id) {
      adrs(data: { first: 10 }) { totalCount edges { node { id } } }
      requirements(data: { first: 10 }) { totalCount edges { node { id } } }
      workPlans(data: { first: 10 }) { totalCount edges { node { id } } }
      workItems(data: { first: 10 }) { totalCount edges { node { id } } }
    }
  }
`;

const CREATE_ADR = `
  mutation CreateAdr($data: AdrInput!) {
    createAdr(data: $data) { id title status context decision }
  }
`;

const UPDATE_ADR = `
  mutation UpdateAdr($data: AdrInput!) {
    updateAdr(data: $data) { id title status context }
  }
`;

const DELETE_ADR = `
  mutation DeleteAdr($data: RecordDeleteInput!) {
    deleteAdr(data: $data)
  }
`;

const GET_ADR = `
  query Adr($projectId: ID!, $id: ID!) {
    project(id: $projectId) {
      adr(id: $id) { id title }
    }
  }
`;

const LIST_ADRS = `
  query Adrs($projectId: ID!, $data: RecordListInput!) {
    project(id: $projectId) {
      adrs(data: $data) {
        totalCount
        edges { cursor node { id } }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
  }
`;

const CREATE_REQUIREMENT = `
  mutation CreateRequirement($data: RequirementInput!) {
    createRequirement(data: $data) { id title status }
  }
`;

const UPDATE_REQUIREMENT = `
  mutation UpdateRequirement($data: RequirementInput!) {
    updateRequirement(data: $data) { id title }
  }
`;

const DELETE_REQUIREMENT = `
  mutation DeleteRequirement($data: RecordDeleteInput!) {
    deleteRequirement(data: $data)
  }
`;

const CREATE_WORK_PLAN = `
  mutation CreateWorkPlan($data: WorkPlanInput!) {
    createWorkPlan(data: $data) { id title status }
  }
`;

const UPDATE_WORK_PLAN = `
  mutation UpdateWorkPlan($data: WorkPlanInput!) {
    updateWorkPlan(data: $data) { id title }
  }
`;

const DELETE_WORK_PLAN = `
  mutation DeleteWorkPlan($data: RecordDeleteInput!) {
    deleteWorkPlan(data: $data)
  }
`;

const CREATE_WORK_ITEM = `
  mutation CreateWorkItem($data: WorkItemInput!) {
    createWorkItem(data: $data) { id title plan }
  }
`;

const UPDATE_WORK_ITEM = `
  mutation UpdateWorkItem($data: WorkItemInput!) {
    updateWorkItem(data: $data) { id title }
  }
`;

const DELETE_WORK_ITEM = `
  mutation DeleteWorkItem($data: RecordDeleteInput!) {
    deleteWorkItem(data: $data)
  }
`;

const LIST_RECORDS = `
  query ListRecords($projectId: ID!, $data: RecordListInput!) {
    project(id: $projectId) {
      requirements(data: $data) {
        totalCount
        edges { cursor node { id } }
        pageInfo { endCursor hasNextPage }
      }
      workPlans(data: $data) {
        totalCount
        edges { cursor node { id } }
        pageInfo { endCursor hasNextPage }
      }
      workItems(data: $data) {
        totalCount
        edges { cursor node { id } }
        pageInfo { endCursor hasNextPage }
      }
    }
  }
`;

const GET_RECORD_SMOKE = `
  query RecordSmoke(
    $projectId: ID!
    $requirementId: ID!
    $workPlanId: ID!
    $workItemId: ID!
  ) {
    project(id: $projectId) {
      requirement(id: $requirementId) { id }
      workPlan(id: $workPlanId) { id }
      workItem(id: $workItemId) { id }
    }
  }
`;

async function startApp(): Promise<INestApplication> {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  await app.init();
  return app;
}

function projectIds(response: {
  body: { data: { projects: { edges: { node: { id: string } }[] } } };
}): string[] {
  return response.body.data.projects.edges.map((edge) => edge.node.id);
}

async function graphql(app: INestApplication, query: string, variables?: Record<string, unknown>) {
  return request(app.getHttpServer()).post('/graphql').send({ query, variables }).expect(200);
}

async function createProject(
  app: INestApplication,
  createdProjectIds: string[],
  name: string,
): Promise<{ id: string; name: string }> {
  const response = await graphql(app, CREATE_PROJECT, { data: { name } });
  expect(response.body.errors).toBeUndefined();
  const { projectId } = response.body.data.createProject as { projectId: string };
  createdProjectIds.push(projectId);
  return { id: projectId, name };
}

function adrInput(projectId: string, id: string, title: string) {
  return {
    projectId,
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
