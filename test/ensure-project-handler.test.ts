import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import { EnsureProjectTestKit } from './support/ensure-project-test-kit.js';

describe('EnsureProjectHandler', () => {
  let projects: EnsureProjectTestKit;

  beforeAll(async () => {
    projects = await EnsureProjectTestKit.start();
  });

  afterEach(async () => projects.cleanup());
  afterAll(async () => projects.close());

  test('creates a system project with its root branch and initial revisions', async () => {
    const project = projects.systemProject();
    const projectId = await projects.projectApi.ensureProject(project);

    expect(projectId).toBe(project.id);
    await expect(projects.projectApi.getProject({ id: projectId })).resolves.toMatchObject(project);

    const branch = await projects.engine.getBranch({
      projectId,
      branchName: 'master',
    });
    const head = await projects.engine.getHeadRevision(branch.id);
    const draft = await projects.engine.getDraftRevision(branch.id);
    const revisions = await projects.engine.getRevisionsByBranchId({
      branchId: branch.id,
      first: 3,
    });

    expect(head.isStart).toBe(true);
    expect(draft.parentId).toBe(head.id);
    expect(revisions.totalCount).toBe(2);
  });

  test('returns the same id for an existing project', async () => {
    const project = projects.systemProject();
    const projectId = await projects.projectApi.ensureProject(project);

    await expect(projects.projectApi.ensureProject(project)).resolves.toBe(projectId);
  });
});
