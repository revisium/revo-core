import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { IdService } from '@revisium/engine';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { ProjectKind, ProjectStatus } from '../src/__generated__/client/enums.js';
import { AppModule } from '../src/app.module.js';
import { UserProjectMigrationsService } from '../src/features/project/user-project-migrations.service.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

const DEFAULT_BRANCH_NAME = 'master';

type SeededProjects = {
  readonly unfinishedWithBranch: string;
  readonly unfinishedWithoutEngineData: string;
  readonly ready: string;
  readonly all: readonly string[];
};

describe('UserProjectMigrationsService', () => {
  test('cleans unfinished projects before updating the ready ones', async () => {
    const dispatched: string[] = [];
    const service = new UserProjectMigrationsService(
      commandBusFake(dispatched, { failFor: 'broken' }),
      queryBusFake({ unfinished: ['stale'], ready: ['broken', 'healthy'] }),
    );

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();

    expect(dispatched).toEqual([
      'DeleteUserProjectCommand:stale',
      'ApplyContentModelCommand:broken',
      'ApplyContentModelCommand:healthy',
    ]);
  });
});

describe('project bootstrap cleanup', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService;
  let seeded: SeededProjects | undefined;

  beforeEach(async () => {
    prisma = new PrismaService({
      getOrThrow: () => process.env.DATABASE_URL,
    } as unknown as ConfigService);
    await prisma.onModuleInit();
  });

  afterEach(async () => {
    const projectIds = seeded === undefined ? [] : [...seeded.all];
    seeded = undefined;

    if (projectIds.length > 0) {
      await prisma.$transaction([
        prisma.branch.deleteMany({ where: { projectId: { in: projectIds } } }),
        prisma.project.deleteMany({ where: { id: { in: projectIds } } }),
      ]);
    }

    await app?.close();
    app = undefined;
    await prisma.onModuleDestroy();
  });

  test('removes unfinished projects with or without engine data and keeps ready ones', async () => {
    seeded = await seedProjects(prisma);

    app = await startApp();

    await expect(
      prisma.project.findUnique({ where: { id: seeded.unfinishedWithBranch } }),
    ).resolves.toBeNull();
    await expect(
      prisma.project.findUnique({ where: { id: seeded.unfinishedWithoutEngineData } }),
    ).resolves.toBeNull();
    await expect(
      prisma.branch.count({ where: { projectId: seeded.unfinishedWithBranch } }),
    ).resolves.toBe(0);
    await expect(
      prisma.project.findUnique({ where: { id: seeded.ready } }),
    ).resolves.not.toBeNull();
  });
});

function commandBusFake(dispatched: string[], options: { failFor: string }): CommandBus {
  return {
    execute: async (command: object) => {
      const { projectId } = (command as { data: { projectId: string } }).data;
      dispatched.push(`${command.constructor.name}:${projectId}`);

      if (
        command.constructor.name === 'ApplyContentModelCommand' &&
        projectId === options.failFor
      ) {
        throw new Error(`Content model update failed for ${projectId}`);
      }

      return true;
    },
  } as unknown as CommandBus;
}

function queryBusFake(ids: { unfinished: string[]; ready: string[] }): QueryBus {
  return {
    execute: async (query: object) =>
      query.constructor.name === 'ListUnfinishedUserProjectIdsQuery' ? ids.unfinished : ids.ready,
  } as unknown as QueryBus;
}

async function seedProjects(prisma: PrismaService): Promise<SeededProjects> {
  const ids = new IdService();
  const unfinishedWithBranch = 'creating_with_branch';
  const unfinishedWithoutEngineData = 'creating_without_engine_data';
  const ready = 'ready_user_project';

  await prisma.project.create({
    data: {
      id: unfinishedWithBranch,
      name: 'Interrupted with branch',
      kind: ProjectKind.USER,
      status: ProjectStatus.CREATING,
      branches: { create: branchWithRevisions(ids) },
    },
  });
  await prisma.project.create({
    data: {
      id: unfinishedWithoutEngineData,
      name: 'Unfinished without engine data',
      kind: ProjectKind.USER,
      status: ProjectStatus.CREATING,
    },
  });
  await prisma.project.create({
    data: {
      id: ready,
      name: 'Ready project',
      kind: ProjectKind.USER,
      status: ProjectStatus.ACTIVE,
      branches: { create: branchWithRevisions(ids) },
    },
  });

  return {
    unfinishedWithBranch,
    unfinishedWithoutEngineData,
    ready,
    all: [unfinishedWithBranch, unfinishedWithoutEngineData, ready],
  };
}

function branchWithRevisions(ids: IdService) {
  const baseRevisionId = ids.generate();

  return {
    id: ids.generate(),
    name: DEFAULT_BRANCH_NAME,
    isRoot: true,
    revisions: {
      createMany: {
        data: [
          { id: baseRevisionId, isHead: true, isStart: true },
          { id: ids.generate(), parentId: baseRevisionId, isDraft: true },
        ],
      },
    },
  };
}

async function startApp(): Promise<INestApplication> {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  await app.init();

  return app;
}
