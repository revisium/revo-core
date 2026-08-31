import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EngineApiService, EngineModule, SystemTablesService } from '@revisium/engine';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { databaseConfig } from '../src/config/database.config.js';
import { ProjectApiService } from '../src/features/project/project-api.service.js';
import { ProjectModule } from '../src/features/project/project.module.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

const DEFAULT_BRANCH_NAME = 'master';
const CONTENT_MODEL_FAILURE = 'Content model installation failed in the test.';

type Started = {
  readonly module: TestingModule;
  readonly projects: ProjectApiService;
  readonly engine: EngineApiService;
  readonly prisma: PrismaService;
};

describe('CreateUserProjectHandler', () => {
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

  test('commits the content model above an empty base revision', async () => {
    started = await start();
    const { projectId } = await started.projects.createUserProject({ name: 'Revision layout' });
    createdProjectIds.push(projectId);

    const branch = await started.engine.getBranch({
      projectId,
      branchName: DEFAULT_BRANCH_NAME,
    });
    const revisions = await started.prisma.revision.findMany({
      where: { branchId: branch.id },
      orderBy: { sequence: 'asc' },
      select: {
        id: true,
        isStart: true,
        isHead: true,
        isDraft: true,
        hasChanges: true,
        parentId: true,
        tables: { select: { versionId: true } },
      },
    });

    expect(revisions).toHaveLength(3);

    const [base, head, draft] = revisions;
    expect(base).toMatchObject({ isStart: true, isHead: false, isDraft: false, parentId: null });
    expect(base?.tables).toHaveLength(0);

    expect(head).toMatchObject({
      isStart: false,
      isHead: true,
      isDraft: false,
      parentId: base?.id,
    });
    expect(head?.tables.length).toBeGreaterThan(0);

    expect(draft).toMatchObject({
      isStart: false,
      isHead: false,
      isDraft: true,
      hasChanges: false,
      parentId: head?.id,
    });
    expect(draft?.tables).toHaveLength(head?.tables.length ?? 0);
  });

  test('does not keep a project that was never committed', async () => {
    started = await start();
    vi.spyOn(started.engine, 'applyMigrations').mockResolvedValue([]);
    const projectsBefore = await started.prisma.project.count();
    const branchesBefore = await started.prisma.branch.count();

    await expect(started.projects.createUserProject({ name: 'Uncommitted' })).rejects.toThrow(
      'Project creation did not publish the initial revision.',
    );

    await expect(
      started.prisma.project.findFirst({ where: { name: 'Uncommitted' } }),
    ).resolves.toBeNull();
    await expect(started.prisma.project.count()).resolves.toBe(projectsBefore);
    await expect(started.prisma.branch.count()).resolves.toBe(branchesBefore);
  });

  test('leaves no project rows behind when the content model fails', async () => {
    started = await start({ failContentModel: true });
    const projectsBefore = await started.prisma.project.count();
    const branchesBefore = await started.prisma.branch.count();
    const revisionsBefore = await started.prisma.revision.count();

    await expect(started.projects.createUserProject({ name: 'Doomed' })).rejects.toThrow(
      CONTENT_MODEL_FAILURE,
    );

    await expect(
      started.prisma.project.findFirst({ where: { name: 'Doomed' } }),
    ).resolves.toBeNull();
    await expect(started.prisma.project.count()).resolves.toBe(projectsBefore);
    await expect(started.prisma.branch.count()).resolves.toBe(branchesBefore);
    await expect(started.prisma.revision.count()).resolves.toBe(revisionsBefore);
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
