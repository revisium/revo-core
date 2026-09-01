import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EngineModule } from '@revisium/engine';
import { afterEach, describe, expect, test } from 'vitest';

import { ProjectKind, ProjectStatus } from '../src/__generated__/client/enums.js';
import { databaseConfig } from '../src/config/database.config.js';
import { ProjectApiService } from '../src/features/project/project-api.service.js';
import { ProjectModule } from '../src/features/project/project.module.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

type Started = {
  readonly module: TestingModule;
  readonly projects: ProjectApiService;
  readonly prisma: PrismaService;
};

describe('ArchiveUserProjectHandler', () => {
  let started: Started | undefined;
  const createdProjectIds: string[] = [];

  afterEach(async () => {
    if (started === undefined) {
      return;
    }

    const projectIds = createdProjectIds.splice(0);

    if (projectIds.length > 0) {
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

    await expect(outcome).rejects.toBeInstanceOf(NotFoundException);
    await expect(outcome).rejects.toThrow('Project was not found.');
  });

  test('rejects a project stuck in CREATING with notFound', async () => {
    started = await start();
    const projectId = await createProject(started.prisma, { status: ProjectStatus.CREATING });
    createdProjectIds.push(projectId);

    const outcome = started.projects.archiveUserProject({ projectId });

    await expect(outcome).rejects.toBeInstanceOf(NotFoundException);
    await expect(outcome).rejects.toThrow('Project was not found.');
  });

  test('rejects an already archived project with notActive, status unchanged', async () => {
    started = await start();
    const projectId = await createProject(started.prisma, { status: ProjectStatus.ARCHIVED });
    createdProjectIds.push(projectId);

    const outcome = started.projects.archiveUserProject({ projectId });

    await expect(outcome).rejects.toBeInstanceOf(ConflictException);
    await expect(outcome).rejects.toThrow('Project is not active.');

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

    await expect(outcome).rejects.toBeInstanceOf(NotFoundException);
    await expect(outcome).rejects.toThrow('Project was not found.');
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
  }).compile();
  await module.init();

  return {
    module,
    projects: module.get(ProjectApiService),
    prisma: module.get(PrismaService),
  };
}
