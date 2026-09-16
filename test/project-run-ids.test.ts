import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { EngineModule } from '@revisium/engine';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { ProjectKind, ProjectStatus } from '../src/__generated__/client/enums.js';
import { databaseConfig } from '../src/config/database.config.js';
import { ProjectApiService } from '../src/features/project/project-api.service.js';
import { RunModule } from '../src/features/run/run.module.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { RevoRunService } from '../src/infrastructure/run-runtime/revo-run.service.js';
import { RunRuntimeModule } from '../src/infrastructure/run-runtime/run-runtime.module.js';
import { ProjectTestRuntimeModule } from './support/project-test-runtime.module.js';

describe('project run IDs query', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let projects: ProjectApiService;
  const projectIds: string[] = [];

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
        EngineModule.forRoot(),
        RunModule,
      ],
    })
      .overrideModule(RunRuntimeModule)
      .useModule(ProjectTestRuntimeModule)
      .overrideProvider(RevoRunService)
      .useValue({})
      .compile();
    await module.init();
    prisma = module.get(PrismaService);
    projects = module.get(ProjectApiService);
  });

  afterEach(async () => {
    await prisma.$transaction([
      prisma.projectRun.deleteMany({ where: { projectId: { in: projectIds } } }),
      prisma.project.deleteMany({ where: { id: { in: projectIds } } }),
    ]);
    projectIds.length = 0;
    await module.close();
  });

  test('returns only the selected user project reservations, including archived projects', async () => {
    const active = await prisma.project.create({
      data: { name: 'Active', kind: ProjectKind.USER, status: ProjectStatus.ACTIVE },
    });
    const archived = await prisma.project.create({
      data: { name: 'Archived', kind: ProjectKind.USER, status: ProjectStatus.ARCHIVED },
    });
    projectIds.push(active.id, archived.id);
    await prisma.projectRun.createMany({
      data: [
        { projectId: active.id, runId: 'run_active_one' },
        { projectId: active.id, runId: 'run_active_two' },
        { projectId: archived.id, runId: 'run_archived' },
      ],
    });

    await expect(projects.getProjectRunIds(active.id)).resolves.toEqual([
      'run_active_one',
      'run_active_two',
    ]);
    await expect(projects.getProjectRunIds(archived.id)).resolves.toEqual(['run_archived']);
  });

  test('rejects missing, system, and creating projects', async () => {
    const system = await prisma.project.create({
      data: { name: 'System', kind: ProjectKind.SYSTEM, status: ProjectStatus.ACTIVE },
    });
    const creating = await prisma.project.create({
      data: { name: 'Creating', kind: ProjectKind.USER, status: ProjectStatus.CREATING },
    });
    projectIds.push(system.id, creating.id);

    await expect(projects.getProjectRunIds('missing-project')).rejects.toThrow(
      'Project was not found.',
    );
    await expect(projects.getProjectRunIds(system.id)).rejects.toThrow('Project was not found.');
    await expect(projects.getProjectRunIds(creating.id)).rejects.toThrow('Project was not found.');
  });
});
