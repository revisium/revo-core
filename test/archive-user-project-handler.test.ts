import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EngineModule } from '@revisium/engine';
import type { RunSnapshot } from '@revisium/revo-run';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ProjectKind, ProjectStatus } from '../src/__generated__/client/enums.js';
import { databaseConfig } from '../src/config/database.config.js';
import { ProjectErrorCode } from '../src/features/project/contracts/project.errors.js';
import { ProjectApiService } from '../src/features/project/project-api.service.js';
import { ProjectModule } from '../src/features/project/project.module.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { RevoRunService } from '../src/infrastructure/run-runtime/revo-run.service.js';
import { RunRuntimeModule } from '../src/infrastructure/run-runtime/run-runtime.module.js';
import { ProjectTestRuntimeModule } from './support/project-test-runtime.module.js';

type Started = {
  readonly module: TestingModule;
  readonly projects: ProjectApiService;
  readonly prisma: PrismaService;
};

type ArchiveRunSnapshot = Pick<RunSnapshot, 'runId' | 'status'>;

let getRun: (runId: string) => Promise<ArchiveRunSnapshot | undefined> = async () => undefined;

describe('ArchiveUserProjectHandler', () => {
  let started: Started | undefined;
  const createdProjectIds: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    getRun = async () => undefined;

    if (started === undefined) {
      return;
    }

    const projectIds = createdProjectIds.splice(0);

    if (projectIds.length > 0) {
      await started.prisma.projectRun.deleteMany({ where: { projectId: { in: projectIds } } });
      await started.prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    }

    await started.module.close();
    started = undefined;
  });

  test('archives an active project', async () => {
    started = await start();
    const projectId = await createProject(started.prisma, { status: ProjectStatus.ACTIVE });
    createdProjectIds.push(projectId);

    const result = await started.projects.archiveUserProject({ projectId });

    expect(result).toBe(true);
    const project = await started.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    expect(project.status).toBe(ProjectStatus.ARCHIVED);
  });

  test('moves updatedAt forward on the transition', async () => {
    started = await start();
    const staleUpdatedAt = new Date(Date.now() - 60_000);
    const projectId = await createProject(started.prisma, {
      status: ProjectStatus.ACTIVE,
      updatedAt: staleUpdatedAt,
    });
    createdProjectIds.push(projectId);

    await started.projects.archiveUserProject({ projectId });
    const after = await started.prisma.project.findUniqueOrThrow({ where: { id: projectId } });

    expect(after.updatedAt.getTime()).toBeGreaterThan(staleUpdatedAt.getTime());
  });

  test('rejects an unknown project id with notFound', async () => {
    started = await start();

    const outcome = started.projects.archiveUserProject({ projectId: 'unknown-project-id' });

    await expect(outcome).rejects.toMatchObject({ code: ProjectErrorCode.notFound });
  });

  test('rejects a project stuck in CREATING with notFound', async () => {
    started = await start();
    const projectId = await createProject(started.prisma, { status: ProjectStatus.CREATING });
    createdProjectIds.push(projectId);

    const outcome = started.projects.archiveUserProject({ projectId });

    await expect(outcome).rejects.toMatchObject({ code: ProjectErrorCode.notFound });
  });

  test('rejects an already archived project with notActive, status unchanged', async () => {
    started = await start();
    const projectId = await createProject(started.prisma, { status: ProjectStatus.ARCHIVED });
    createdProjectIds.push(projectId);

    const outcome = started.projects.archiveUserProject({ projectId });

    await expect(outcome).rejects.toMatchObject({ code: ProjectErrorCode.notActive });

    const project = await started.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    expect(project.status).toBe(ProjectStatus.ARCHIVED);
  });

  test('rejects a SYSTEM project with notFound', async () => {
    started = await start();
    const projectId = await createProject(started.prisma, {
      status: ProjectStatus.ACTIVE,
      kind: ProjectKind.SYSTEM,
    });
    createdProjectIds.push(projectId);

    const outcome = started.projects.archiveUserProject({ projectId });

    await expect(outcome).rejects.toMatchObject({ code: ProjectErrorCode.notFound });
  });

  test('keeps an active project when a linked run is unresolved', async () => {
    started = await start();
    const projectId = await createProject(started.prisma, { status: ProjectStatus.ACTIVE });
    createdProjectIds.push(projectId);
    await started.prisma.projectRun.create({ data: { projectId, runId: 'r_unresolved' } });

    await expect(started.projects.archiveUserProject({ projectId })).rejects.toMatchObject({
      code: ProjectErrorCode.hasActiveRuns,
    });
    await expect(
      started.prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
    ).resolves.toMatchObject({ status: ProjectStatus.ACTIVE });
  });

  test.each(['pending', 'running', 'cancelling', 'recovery_required'] as const)(
    'blocks a %s run and identifies it in the conflict',
    async (status) => {
      getRun = async (runId) => ({ runId, status });
      started = await start();
      const projectId = await createProject(started.prisma, { status: ProjectStatus.ACTIVE });
      createdProjectIds.push(projectId);
      await started.prisma.projectRun.create({ data: { projectId, runId: `r_${status}` } });

      await expect(started.projects.archiveUserProject({ projectId })).rejects.toMatchObject({
        code: ProjectErrorCode.hasActiveRuns,
        details: { runIds: [`r_${status}`] },
      });
      expect(await started.prisma.project.findUnique({ where: { id: projectId } })).toMatchObject({
        status: ProjectStatus.ACTIVE,
      });
    },
  );

  test.each(['succeeded', 'failed', 'cancelled'] as const)(
    'archives and retains a terminal %s run relation',
    async (status) => {
      getRun = async (runId) => ({ runId, status });
      started = await start();
      const projectId = await createProject(started.prisma, { status: ProjectStatus.ACTIVE });
      createdProjectIds.push(projectId);
      await started.prisma.projectRun.create({ data: { projectId, runId: `r_${status}` } });

      await expect(started.projects.archiveUserProject({ projectId })).resolves.toBe(true);
      await expect(started.prisma.projectRun.count({ where: { projectId } })).resolves.toBe(1);
    },
  );

  test('keeps an active project and reports a failed linked-run observation', async () => {
    const observationError = new Error('runtime unavailable');
    getRun = async () => {
      throw observationError;
    };
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    started = await start();
    const projectId = await createProject(started.prisma, { status: ProjectStatus.ACTIVE });
    createdProjectIds.push(projectId);
    await started.prisma.projectRun.create({ data: { projectId, runId: 'r_observation_failed' } });

    await expect(started.projects.archiveUserProject({ projectId })).rejects.toBe(observationError);
    await expect(
      started.prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
    ).resolves.toMatchObject({ status: ProjectStatus.ACTIVE });
    await expect(started.prisma.projectRun.count({ where: { projectId } })).resolves.toBe(1);
    expect(logged).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'project.archive.run_observation',
        projectId,
        runId: 'r_observation_failed',
      }),
    );
  });
});

async function createProject(
  prisma: PrismaService,
  options: { status: ProjectStatus; kind?: ProjectKind; updatedAt?: Date },
): Promise<string> {
  const project = await prisma.project.create({
    data: {
      name: 'Archive target',
      status: options.status,
      kind: options.kind ?? ProjectKind.USER,
      ...(options.updatedAt === undefined ? {} : { updatedAt: options.updatedAt }),
    },
    select: { id: true },
  });

  return project.id;
}

async function start(): Promise<Started> {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
      EngineModule.forRoot(),
      ProjectModule,
    ],
  })
    .overrideModule(RunRuntimeModule)
    .useModule(ProjectTestRuntimeModule)
    .overrideProvider(RevoRunService)
    .useValue({ getRun: (runId: string) => getRun(runId) })
    .compile();
  await module.init();

  return {
    module,
    projects: module.get(ProjectApiService),
    prisma: module.get(PrismaService),
  };
}
