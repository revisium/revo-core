import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EngineApiService, EngineModule, SystemTablesService } from '@revisium/engine';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ProjectStatus } from '../src/__generated__/client/enums.js';
import { databaseConfig } from '../src/config/database.config.js';
import { ProjectApiService } from '../src/features/project/project-api.service.js';
import { ProjectModule } from '../src/features/project/project.module.js';
import { SYSTEM_PLAYBOOKS_PROJECT } from '../src/features/revisium-bootstrap/revisium-bootstrap.constants.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

const CONTENT_MODEL_FAILURE = 'Content model installation failed in the test.';

type Started = {
  readonly module: TestingModule;
  readonly projects: ProjectApiService;
  readonly engine: EngineApiService;
  readonly prisma: PrismaService;
};

describe('RestoreUserProjectHandler', () => {
  let started: Started | undefined;
  const createdProjectIds: string[] = [];

  afterEach(async () => {
    if (started === undefined) {
      return;
    }

    const projectIds = createdProjectIds.splice(0);

    if (projectIds.length > 0) {
      await started.prisma.$transaction([
        started.prisma.branch.deleteMany({ where: { projectId: { in: projectIds } } }),
        started.prisma.project.deleteMany({ where: { id: { in: projectIds } } }),
      ]);
    }

    await started.module.close();
    started = undefined;
  });

  test('activates an archived project', async () => {
    started = await start();
    const { projectId } = await started.projects.createUserProject({ name: 'Archived' });
    createdProjectIds.push(projectId);
    await setProjectStatus(started.prisma, projectId, ProjectStatus.ARCHIVED);
    const archived = await readProject(started.prisma, projectId);

    await expect(started.projects.restoreUserProject({ projectId })).resolves.toBe(true);

    const restored = await readProject(started.prisma, projectId);
    expect(restored.status).toBe(ProjectStatus.ACTIVE);
    expect(restored.updatedAt.getTime()).toBeGreaterThan(archived.updatedAt.getTime());
  });

  test('rejects a project that is not archived', async () => {
    started = await start();
    const { projectId } = await started.projects.createUserProject({ name: 'Active' });
    createdProjectIds.push(projectId);

    await expect(started.projects.restoreUserProject({ projectId })).rejects.toThrow(
      'Project is not archived.',
    );

    await expect(readProject(started.prisma, projectId)).resolves.toMatchObject({
      status: ProjectStatus.ACTIVE,
    });
  });

  test('rejects a project that is still being created', async () => {
    started = await start();
    const { projectId } = await started.projects.createUserProject({ name: 'Creating' });
    createdProjectIds.push(projectId);
    await setProjectStatus(started.prisma, projectId, ProjectStatus.CREATING);
    const applyMigrations = vi.spyOn(started.engine, 'applyMigrations');

    await expect(started.projects.restoreUserProject({ projectId })).rejects.toThrow(
      'Project was not found.',
    );
    expect(applyMigrations).not.toHaveBeenCalled();

    await expect(readProject(started.prisma, projectId)).resolves.toMatchObject({
      status: ProjectStatus.CREATING,
    });
  });

  test('rejects a project that does not exist', async () => {
    started = await start();
    const applyMigrations = vi.spyOn(started.engine, 'applyMigrations');

    await expect(
      started.projects.restoreUserProject({ projectId: 'missing-project' }),
    ).rejects.toThrow('Project was not found.');
    expect(applyMigrations).not.toHaveBeenCalled();
  });

  test('rejects a project that is not owned by a user', async () => {
    started = await start();
    await started.projects.ensureProject(SYSTEM_PLAYBOOKS_PROJECT);
    const applyMigrations = vi.spyOn(started.engine, 'applyMigrations');

    await expect(
      started.projects.restoreUserProject({ projectId: SYSTEM_PLAYBOOKS_PROJECT.id }),
    ).rejects.toThrow('Project was not found.');
    expect(applyMigrations).not.toHaveBeenCalled();

    await expect(readProject(started.prisma, SYSTEM_PLAYBOOKS_PROJECT.id)).resolves.toMatchObject({
      status: ProjectStatus.ACTIVE,
    });
  });

  test('reports a conflict when the project stops being archived mid-restore', async () => {
    started = await start();
    const { projectId } = await started.projects.createUserProject({ name: 'Raced restore' });
    createdProjectIds.push(projectId);
    await setProjectStatus(started.prisma, projectId, ProjectStatus.ARCHIVED);
    const { prisma } = started;
    vi.spyOn(started.engine, 'applyMigrations').mockImplementation(async () => {
      await setProjectStatus(prisma, projectId, ProjectStatus.ACTIVE);

      return [];
    });

    await expect(started.projects.restoreUserProject({ projectId })).rejects.toThrow(
      'Project is not archived.',
    );

    await expect(readProject(started.prisma, projectId)).resolves.toMatchObject({
      status: ProjectStatus.ACTIVE,
    });
  });

  test('keeps the project archived when the content model update fails', async () => {
    started = await start();
    const { projectId } = await started.projects.createUserProject({ name: 'Doomed restore' });
    createdProjectIds.push(projectId);
    await setProjectStatus(started.prisma, projectId, ProjectStatus.ARCHIVED);
    const healthy = started;
    started = await start({ failContentModel: true });
    await healthy.module.close();

    await expect(started.projects.restoreUserProject({ projectId })).rejects.toThrow(
      CONTENT_MODEL_FAILURE,
    );

    await expect(readProject(started.prisma, projectId)).resolves.toMatchObject({
      status: ProjectStatus.ARCHIVED,
    });
  });

  test('publishes a revision when the content model update commits', async () => {
    started = await start();
    const { projectId } = await started.projects.createUserProject({ name: 'Outdated model' });
    createdProjectIds.push(projectId);
    await setProjectStatus(started.prisma, projectId, ProjectStatus.ARCHIVED);
    await markDraftChanged(started.prisma, projectId);
    vi.spyOn(started.engine, 'applyMigrations').mockResolvedValue([
      { id: 'outdated-migration', status: 'applied' },
    ]);
    const revisionsBefore = await countRevisions(started.prisma, projectId);

    await expect(started.projects.restoreUserProject({ projectId })).resolves.toBe(true);

    await expect(countRevisions(started.prisma, projectId)).resolves.toBe(revisionsBefore + 1);
  });

  test('publishes no revision when the content model is already current', async () => {
    started = await start();
    const { projectId } = await started.projects.createUserProject({ name: 'Current model' });
    createdProjectIds.push(projectId);
    await setProjectStatus(started.prisma, projectId, ProjectStatus.ARCHIVED);
    const revisionsBefore = await countRevisions(started.prisma, projectId);

    await expect(started.projects.restoreUserProject({ projectId })).resolves.toBe(true);

    await expect(countRevisions(started.prisma, projectId)).resolves.toBe(revisionsBefore);
  });
});

async function start(options: { failContentModel?: boolean } = {}): Promise<Started> {
  const builder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
      EngineModule.forRoot(),
      ProjectModule,
    ],
  });

  if (options.failContentModel === true) {
    builder.overrideProvider(SystemTablesService).useValue({
      ensureSystemTable: () => {
        throw new Error(CONTENT_MODEL_FAILURE);
      },
    });
  }

  const module = await builder.compile();
  await module.init();

  return {
    module,
    projects: module.get(ProjectApiService),
    engine: module.get(EngineApiService),
    prisma: module.get(PrismaService),
  };
}

function setProjectStatus(
  prisma: PrismaService,
  projectId: string,
  status: ProjectStatus,
): Promise<unknown> {
  return prisma.project.update({
    where: { id: projectId },
    data: { status },
    select: { id: true },
  });
}

// @revisium/engine commits a draft revision only when the draft carries changes, so a restore
// cannot publish anything unless this engine-owned flag is set first.
function markDraftChanged(prisma: PrismaService, projectId: string): Promise<unknown> {
  return prisma.revision.updateMany({
    where: { isDraft: true, branch: { projectId } },
    data: { hasChanges: true },
  });
}

function countRevisions(prisma: PrismaService, projectId: string): Promise<number> {
  return prisma.revision.count({ where: { branch: { projectId } } });
}

function readProject(
  prisma: PrismaService,
  projectId: string,
): Promise<{ status: ProjectStatus; updatedAt: Date }> {
  return prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { status: true, updatedAt: true },
  });
}
