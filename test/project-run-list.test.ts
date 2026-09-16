import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { EngineModule } from '@revisium/engine';
import { RunManagerError, type RunSnapshot, type RunStatus } from '@revisium/revo-run';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ProjectKind, ProjectStatus } from '../src/__generated__/client/enums.js';
import { databaseConfig } from '../src/config/database.config.js';
import { ProjectApiService } from '../src/features/project/project-api.service.js';
import { RunApiService } from '../src/features/run/run-api.service.js';
import { RunModule } from '../src/features/run/run.module.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { TransactionPrismaService } from '../src/infrastructure/database/transaction-prisma.service.js';
import { RevoRunService } from '../src/infrastructure/run-runtime/revo-run.service.js';
import { RunRuntimeModule } from '../src/infrastructure/run-runtime/run-runtime.module.js';
import { ProjectTestRuntimeModule } from './support/project-test-runtime.module.js';

describe('project run list acceptance', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let projects: ProjectApiService;
  let runs: RunApiService;
  let transactions: TransactionPrismaService;
  const projectIds: string[] = [];
  const runtime = { getRun: vi.fn<RevoRunService['getRun']>() };

  beforeEach(async () => {
    runtime.getRun.mockReset().mockResolvedValue(undefined);
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
      .useValue(runtime)
      .compile();
    await module.init();
    prisma = module.get(PrismaService);
    projects = module.get(ProjectApiService);
    runs = module.get(RunApiService);
    transactions = module.get(TransactionPrismaService);
  });

  afterEach(async () => {
    if (prisma !== undefined) {
      await prisma.$transaction([
        prisma.projectRun.deleteMany({ where: { projectId: { in: projectIds } } }),
        prisma.project.deleteMany({ where: { id: { in: projectIds } } }),
      ]);
    }
    projectIds.length = 0;
    await module.close();
  });

  test('isolates ownership and applies all seven statuses before pagination', async () => {
    const project = await createProject('List owner');
    const other = await createProject('Other owner');
    const statuses: readonly RunStatus[] = [
      'pending',
      'running',
      'cancelling',
      'recovery_required',
      'succeeded',
      'failed',
      'cancelled',
    ];
    const ownIds = statuses.map((status) => `run_${status}`);
    const otherId = 'run_other';
    const legacy = snapshot('legacy_run', 'succeeded', 0);
    await prisma.projectRun.createMany({
      data: [
        ...ownIds.map((runId) => ({ projectId: project.id, runId })),
        { projectId: other.id, runId: otherId },
      ],
    });
    const snapshots = new Map<string, RunSnapshot>(
      [...ownIds, otherId, legacy.runId].map((runId, index) => [
        runId,
        snapshot(runId, statuses[index % statuses.length] ?? 'pending', index),
      ]),
    );
    snapshots.set(legacy.runId, legacy);
    runtime.getRun.mockImplementation(async (runId) => {
      expect(transactions.getTransactionUnsafe()).toBeUndefined();
      return snapshots.get(runId);
    });

    const all = await runs.listRuns({ projectId: project.id });
    expect(all.totalCount).toBe(7);
    expect(all.edges.map(({ node }) => node.runId)).toEqual([
      'run_cancelled',
      'run_failed',
      'run_succeeded',
      'run_recovery_required',
      'run_cancelling',
      'run_running',
      'run_pending',
    ]);
    expect(all.edges.every(({ node }) => node.projectId === project.id)).toBe(true);

    const filteredPages = await Promise.all(
      statuses.map((status) => runs.listRuns({ projectId: project.id, statuses: [status] })),
    );
    filteredPages.forEach((page, index) => {
      const status = statuses[index];
      if (status === undefined) {
        throw new Error('Expected a status filter.');
      }
      expect(page.totalCount).toBe(1);
      expect(page.edges[0]?.node.status).toBe(status);
    });

    await expect(runs.listRuns({ projectId: project.id, statuses: [] })).resolves.toMatchObject({
      edges: [],
      totalCount: 0,
    });
    await expect(
      runs.listRuns({ projectId: project.id, statuses: ['pending', 'failed'] }),
    ).resolves.toMatchObject({
      totalCount: 2,
    });
    expect(runtime.getRun).not.toHaveBeenCalledWith(otherId);
    await expect(runs.listRuns({ projectId: other.id })).resolves.toMatchObject({
      totalCount: 1,
      edges: [{ node: { runId: otherId, projectId: other.id } }],
    });
    await expect(runs.getRun({ runId: legacy.runId })).resolves.toMatchObject({
      runId: legacy.runId,
      projectId: null,
    });
  });

  test('paginates 101 observations with deterministic ties and one read per reservation', async () => {
    const project = await createProject('Pagination owner');
    const runIds = Array.from(
      { length: 101 },
      (_, index) => `run_${String(index).padStart(3, '0')}`,
    );
    await prisma.projectRun.createMany({
      data: runIds.map((runId) => ({ projectId: project.id, runId })),
    });
    const snapshots = new Map(runIds.map((runId) => [runId, snapshot(runId, 'succeeded', 0)]));
    runtime.getRun.mockImplementation(async (runId) => snapshots.get(runId));

    const first = await runs.listRuns({ projectId: project.id });
    const firstCursor = first.pageInfo.endCursor;
    if (firstCursor === undefined) {
      throw new Error('Expected first page cursor.');
    }
    const second = await runs.listRuns({ projectId: project.id, after: firstCursor });
    const secondCursor = second.pageInfo.endCursor;
    if (secondCursor === undefined) {
      throw new Error('Expected second page cursor.');
    }
    const afterEnd = await runs.listRuns({ projectId: project.id, after: secondCursor });
    const ids = [...first.edges, ...second.edges].map(({ node }) => node.runId);

    expect(first.edges).toHaveLength(100);
    expect(second.edges).toHaveLength(1);
    expect(new Set(ids).size).toBe(101);
    expect(ids).toEqual([...runIds].sort());
    expect(first.totalCount).toBe(101);
    expect(second.totalCount).toBe(101);
    expect(afterEnd).toMatchObject({ edges: [], totalCount: 101 });
    expect(afterEnd.pageInfo).toEqual({ hasNextPage: false, hasPreviousPage: false });
    expect(runtime.getRun).toHaveBeenCalledTimes(303);
  });

  test('filters before slicing and materializes stable observations for page metadata', async () => {
    const project = await createProject('Stable owner');
    const runIds = ['active_old', 'terminal_middle', 'active_new'];
    await prisma.projectRun.createMany({
      data: runIds.map((runId) => ({ projectId: project.id, runId })),
    });
    const snapshots = new Map<string, RunSnapshot>([
      ['active_old', snapshot('active_old', 'running', 2)],
      ['terminal_middle', snapshot('terminal_middle', 'succeeded', 1)],
      ['active_new', snapshot('active_new', 'pending', 0)],
    ]);
    runtime.getRun.mockImplementation(async (runId) => snapshots.get(runId));

    const page = await runs.listRuns({
      projectId: project.id,
      statuses: ['pending', 'running'],
      first: 1,
    });
    snapshots.set('active_new', snapshot('active_new', 'failed', 0));

    expect(page.totalCount).toBe(2);
    expect(page.edges[0]?.node.runId).toBe('active_old');
    expect(page.pageInfo.hasNextPage).toBe(true);
    expect(runtime.getRun).toHaveBeenCalledTimes(3);

    const nextRequest = await runs.listRuns({
      projectId: project.id,
      statuses: ['pending', 'running'],
    });
    expect(nextRequest.totalCount).toBe(1);
    expect(nextRequest.edges[0]?.node).toMatchObject({ runId: 'active_old', status: 'running' });
    expect(runtime.getRun).toHaveBeenCalledTimes(6);
  });

  test('keeps observations collected before an in-flight runtime change', async () => {
    const project = await createProject('In-flight owner');
    const runIds = ['first_run', 'later_run'];
    await prisma.projectRun.createMany({
      data: runIds.map((runId) => ({ projectId: project.id, runId })),
    });
    const snapshots = new Map<string, RunSnapshot>([
      ['first_run', snapshot('first_run', 'running', 1)],
      ['later_run', snapshot('later_run', 'pending', 0)],
    ]);
    runtime.getRun.mockImplementation(async (runId) => {
      if (runId === 'first_run') {
        const original = snapshots.get(runId);
        if (original === undefined) {
          throw new Error('Expected first snapshot.');
        }
        snapshots.set('first_run', snapshot('first_run', 'failed', 1));
        snapshots.set('later_run', snapshot('later_run', 'succeeded', 0));

        return original;
      }

      return snapshots.get(runId);
    });

    const page = await runs.listRuns({ projectId: project.id });

    expect(page).toEqual(
      expect.objectContaining({
        totalCount: 2,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: expect.any(String),
          endCursor: expect.any(String),
        },
      }),
    );
    expect(page.edges.map(({ node }) => ({ runId: node.runId, status: node.status }))).toEqual([
      { runId: 'first_run', status: 'running' },
      { runId: 'later_run', status: 'succeeded' },
    ]);
    expect(runtime.getRun).toHaveBeenCalledTimes(2);
    expect(runtime.getRun).toHaveBeenCalledWith('first_run');
    expect(runtime.getRun).toHaveBeenCalledWith('later_run');
  });

  test('selects all four active statuses and excludes terminal statuses', async () => {
    const project = await createProject('Active owner');
    const statuses: readonly RunStatus[] = [
      'pending',
      'running',
      'cancelling',
      'recovery_required',
      'succeeded',
      'failed',
      'cancelled',
    ];
    const runIds = statuses.map((status) => `active_filter_${status}`);
    await prisma.projectRun.createMany({
      data: runIds.map((runId) => ({ projectId: project.id, runId })),
    });
    runtime.getRun.mockImplementation(async (runId) => {
      const index = runIds.indexOf(runId);
      return snapshot(runId, statuses[index] ?? 'pending', index);
    });

    const page = await runs.listRuns({
      projectId: project.id,
      statuses: ['pending', 'running', 'cancelling', 'recovery_required'],
    });

    expect(page.totalCount).toBe(4);
    expect(page.edges.map(({ node }) => node.status)).toEqual([
      'recovery_required',
      'cancelling',
      'running',
      'pending',
    ]);
  });

  test('traverses a filtered small page without gaps and returns an empty page after the end', async () => {
    const project = await createProject('Small page owner');
    const runIds = ['active_a', 'terminal', 'active_b', 'active_c'];
    await prisma.projectRun.createMany({
      data: runIds.map((runId) => ({ projectId: project.id, runId })),
    });
    const snapshots = new Map<string, RunSnapshot>([
      ['active_a', snapshot('active_a', 'running', 3)],
      ['terminal', snapshot('terminal', 'succeeded', 2)],
      ['active_b', snapshot('active_b', 'pending', 1)],
      ['active_c', snapshot('active_c', 'cancelling', 0)],
    ]);
    runtime.getRun.mockImplementation(async (runId) => snapshots.get(runId));

    const filter = ['pending', 'running', 'cancelling'] as const;
    const first = await runs.listRuns({ projectId: project.id, statuses: filter, first: 2 });
    const firstCursor = first.pageInfo.endCursor;
    if (firstCursor === undefined) {
      throw new Error('Expected first page cursor.');
    }
    const second = await runs.listRuns({
      projectId: project.id,
      statuses: filter,
      first: 2,
      after: firstCursor,
    });
    const secondCursor = second.pageInfo.endCursor;
    if (secondCursor === undefined) {
      throw new Error('Expected second page cursor.');
    }
    const empty = await runs.listRuns({
      projectId: project.id,
      statuses: filter,
      first: 2,
      after: secondCursor,
    });
    const ids = [...first.edges, ...second.edges].map(({ node }) => node.runId);

    expect(ids).toEqual(['active_a', 'active_b', 'active_c']);
    expect(new Set(ids).size).toBe(ids.length);
    expect(first.totalCount).toBe(3);
    expect(second.totalCount).toBe(3);
    expect(first.pageInfo).toMatchObject({ hasNextPage: true, hasPreviousPage: false });
    expect(second.pageInfo).toMatchObject({ hasNextPage: false, hasPreviousPage: true });
    expect(empty).toMatchObject({ edges: [], totalCount: 3 });
    expect(empty.pageInfo).toEqual({ hasNextPage: false, hasPreviousPage: false });
  });

  test('returns an empty connection for a project without observations and for no matches', async () => {
    const project = await createProject('Empty owner');
    await expect(runs.listRuns({ projectId: project.id })).resolves.toEqual({
      edges: [],
      totalCount: 0,
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    });
    const observed = ['terminal_observed', 'running_observed'];
    await prisma.projectRun.createMany({
      data: observed.map((runId) => ({ projectId: project.id, runId })),
    });
    runtime.getRun.mockImplementation(async (runId) =>
      snapshot(runId, runId === 'terminal_observed' ? 'succeeded' : 'running', 0),
    );
    await expect(runs.listRuns({ projectId: project.id, statuses: ['failed'] })).resolves.toEqual({
      edges: [],
      totalCount: 0,
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    });
  });

  test('keeps unresolved reservations blocking archive after empty or failed list reads', async () => {
    const project = await createProject('Archive guard owner');
    const runId = 'run_unresolved';
    await prisma.projectRun.createMany({
      data: [
        { projectId: project.id, runId },
        { projectId: project.id, runId: 'run_success' },
      ],
    });

    await expect(runs.listRuns({ projectId: project.id })).resolves.toMatchObject({
      edges: [],
      totalCount: 0,
    });
    runtime.getRun.mockImplementation(async (observedRunId) =>
      observedRunId === 'run_success' ? snapshot('run_success', 'succeeded', 0) : undefined,
    );
    await expect(projects.archiveUserProject({ projectId: project.id })).rejects.toMatchObject({
      response: { code: 'project_has_active_runs', details: { runIds: [runId] } },
    });

    runtime.getRun
      .mockResolvedValueOnce(snapshot('run_success', 'succeeded', 0))
      .mockRejectedValueOnce(
        new RunManagerError('run_read_failed', { runId, operation: 'get_run' }),
      );
    await expect(runs.listRuns({ projectId: project.id })).rejects.toThrow(
      'Run observation could not be read.',
    );
    expect(await prisma.projectRun.findUnique({ where: { runId } })).toEqual({
      projectId: project.id,
      runId,
    });
    runtime.getRun.mockRejectedValue(
      new RunManagerError('run_read_failed', { runId, operation: 'get_run' }),
    );
    await expect(projects.archiveUserProject({ projectId: project.id })).rejects.toThrow(
      'Run observation could not be read.',
    );
    await expect(prisma.project.findUnique({ where: { id: project.id } })).resolves.toMatchObject({
      status: ProjectStatus.ACTIVE,
    });
  });

  async function createProject(name: string): Promise<{ id: string }> {
    const project = await prisma.project.create({
      data: { name, kind: ProjectKind.USER, status: ProjectStatus.ACTIVE },
      select: { id: true },
    });
    projectIds.push(project.id);
    return project;
  }
});

function snapshot(runId: string, status: RunStatus, age: number): RunSnapshot {
  const createdAt = new Date(Date.UTC(2024, 0, 1, 0, 0, age)).toISOString();

  return {
    schemaVersion: 'run-snapshot/v1',
    runId,
    status,
    createdAt,
    updatedAt: createdAt,
    terminal: null,
  };
}
