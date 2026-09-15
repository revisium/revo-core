import { AsyncLocalStorage } from 'node:async_hooks';

import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { EngineModule } from '@revisium/engine';
import { RunManagerError } from '@revisium/revo-run';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { Prisma } from '../src/__generated__/client/client.js';
import { ProjectKind, ProjectStatus } from '../src/__generated__/client/enums.js';
import { databaseConfig } from '../src/config/database.config.js';
import { ProjectApiService } from '../src/features/project/project-api.service.js';
import { RunApiService } from '../src/features/run/run-api.service.js';
import { RunModule } from '../src/features/run/run.module.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { TransactionPrismaService } from '../src/infrastructure/database/transaction-prisma.service.js';
import { RevoRunService } from '../src/infrastructure/run-runtime/revo-run.service.js';
import { RunRuntimeModule } from '../src/infrastructure/run-runtime/run-runtime.module.js';
import { taskPipeline, taskProfile } from './fixtures/task-pipeline.js';
import { ProjectTestRuntimeModule } from './support/project-test-runtime.module.js';

describe('durable Project Run ownership', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let projects: ProjectApiService;
  let runs: RunApiService;
  let transactions: TransactionPrismaService;
  let projectId: string;
  const projectIds: string[] = [];
  const runtime = {
    createRun: vi.fn<RevoRunService['createRun']>(),
    getRun: vi.fn<RevoRunService['getRun']>(),
    getRunDetails: vi.fn<RevoRunService['getRunDetails']>(),
  };

  beforeEach(async () => {
    runtime.createRun.mockReset();
    runtime.getRun.mockReset().mockResolvedValue(undefined);
    runtime.getRunDetails.mockReset().mockResolvedValue(undefined);
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
    projectId = (
      await prisma.project.create({
        data: { name: 'Run owner', kind: ProjectKind.USER, status: ProjectStatus.ACTIVE },
      })
    ).id;
    projectIds.push(projectId);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.$transaction([
      prisma.projectRun.deleteMany({ where: { projectId: { in: projectIds } } }),
      prisma.project.deleteMany({ where: { id: { in: projectIds } } }),
    ]);
    projectIds.length = 0;
    await module.close();
  });

  const startRun = () =>
    runs.startRun({
      projectId,
      pipeline: taskPipeline(),
      profile: taskProfile(),
      input: {},
    });

  test('commits ownership before calling the runtime outside a transaction', async () => {
    runtime.createRun.mockImplementation(async ({ runId }) => {
      expect(transactions.getTransactionUnsafe()).toBeUndefined();
      expect(await prisma.projectRun.findUnique({ where: { runId } })).toEqual({
        runId,
        projectId,
      });

      return { runId };
    });

    const started = await startRun();

    expect(started.runId).toEqual(expect.any(String));
    expect(runtime.createRun).toHaveBeenCalledTimes(1);
  });

  test.each(['statement', 'commit'] as const)(
    'rolls back ownership on a database %s failure before admission',
    async (phase) => {
      const runSerializable = transactions.runSerializable.bind(transactions);
      vi.spyOn(transactions, 'runSerializable').mockImplementationOnce((handler) =>
        runSerializable(async (transaction) => {
          await handler(transaction);
          expect(await transaction.projectRun.count({ where: { projectId } })).toBe(1);

          if (phase === 'statement') {
            await transaction.$executeRaw`SELECT 1 / 0`;
          } else {
            await transaction.$executeRaw`CREATE TEMP TABLE admission_commit_failure (
            id integer UNIQUE DEFERRABLE INITIALLY DEFERRED
          ) ON COMMIT DROP`;
            await transaction.$executeRaw`INSERT INTO admission_commit_failure VALUES (1), (1)`;
          }
        }),
      );

      await expect(startRun()).rejects.toThrow(
        phase === 'commit' ? 'UniqueConstraintViolation' : 'division by zero',
      );

      expect(runtime.createRun).not.toHaveBeenCalled();
      expect(await prisma.projectRun.count({ where: { projectId } })).toBe(0);
    },
  );

  test.each([
    new RunManagerError('invalid_create_run_input', { path: '/input', reason: 'invalid' }),
    new RunManagerError('invalid_run_id', { path: '/runId', reason: 'invalid' }),
    new RunManagerError('pipeline_compilation_failed', { diagnostics: [] }),
    new RunManagerError('run_profile_invalid', { path: '/profile', reason: 'invalid' }),
    new RunManagerError('run_requirement_unresolved', {
      requirementKey: 'agent',
      bindingKey: null,
      reason: 'missing',
    }),
  ] as const)('releases only its reservation after $code', async (error) => {
    const { code } = error;
    const other = await prisma.project.create({
      data: { name: 'Other owner', status: ProjectStatus.ACTIVE },
    });
    projectIds.push(other.id);
    await prisma.projectRun.createMany({
      data: [
        { projectId, runId: 'r_same_project' },
        { projectId: other.id, runId: 'r_other_project' },
      ],
    });
    runtime.createRun.mockRejectedValue(error);

    await expect(startRun()).rejects.toMatchObject({ code });

    expect(
      await prisma.projectRun.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { runId: 'asc' },
      }),
    ).toEqual([
      { projectId: other.id, runId: 'r_other_project' },
      { projectId, runId: 'r_same_project' },
    ]);
    await projects.releaseRun({ projectId, runId: 'r_other_project' });
    expect(
      await prisma.projectRun.findUnique({ where: { runId: 'r_other_project' } }),
    ).not.toBeNull();
    await projects.releaseRun({ projectId, runId: 'r_same_project' });
    await projects.releaseRun({ projectId, runId: 'r_same_project' });
  });

  test('preserves the original rejection and reports failed cleanup with both causes', async () => {
    runtime.createRun.mockRejectedValue(
      new RunManagerError('pipeline_compilation_failed', { diagnostics: [] }),
    );
    vi.spyOn(projects, 'releaseRun').mockRejectedValue(new Error('cleanup unavailable'));
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(startRun()).rejects.toMatchObject({ code: 'pipeline_compilation_failed' });

    const reservation = await prisma.projectRun.findFirstOrThrow({ where: { projectId } });
    expect(logged).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'run.create.reservation_cleanup',
        runId: reservation.runId,
        error: expect.objectContaining({
          errors: [
            expect.objectContaining({ name: 'RunManagerError' }),
            expect.objectContaining({ message: 'cleanup unavailable' }),
          ],
        }),
      }),
    );
  });

  test.each([
    new RunManagerError('run_admission_failed', { operation: 'workflow_start' }),
    new RunManagerError('run_id_conflict', { runId: 'r_conflict' }),
    new Error('connection lost'),
    new TypeError('unexpected runtime failure'),
  ])('retains ownership after ambiguous $name: $message', async (error) => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    runtime.createRun.mockRejectedValue(error);

    const publicCode = error instanceof RunManagerError ? error.code : undefined;
    await expect(startRun()).rejects.toMatchObject(
      publicCode === undefined ? { message: error.message } : { code: publicCode },
    );

    const reservation = await prisma.projectRun.findFirstOrThrow({ where: { projectId } });
    await expect(runs.getRun({ runId: reservation.runId })).resolves.toBeUndefined();
    runtime.getRun.mockRejectedValue(
      new RunManagerError('run_read_failed', { runId: reservation.runId, operation: 'get_run' }),
    );
    await expect(runs.getRun({ runId: reservation.runId })).rejects.toMatchObject({
      code: 'run_read_failed',
    });
    expect(await prisma.projectRun.findUnique({ where: { runId: reservation.runId } })).toEqual(
      reservation,
    );
  });

  test('archive wins and reservation retries without runtime admission', async () => {
    const result = await raceArchiveAndReservation('archive');

    expect(result.archival).toEqual({ value: true });
    expect(result.admission).toMatchObject({ error: { code: 'project_archived' } });
    expect(result.barriers.reservation.pause).toHaveBeenCalledTimes(2);
    expect(runtime.createRun).not.toHaveBeenCalled();
    expect(await prisma.projectRun.count({ where: { projectId } })).toBe(0);
    expect(await prisma.project.findUnique({ where: { id: projectId } })).toMatchObject({
      status: ProjectStatus.ARCHIVED,
    });
  });

  test('reservation wins and archive retries against unresolved ownership', async () => {
    const result = await raceArchiveAndReservation('reservation');
    const reservation = await prisma.projectRun.findFirstOrThrow({ where: { projectId } });

    expect(result.admission).toEqual({ value: { runId: reservation.runId } });
    expect(result.archival).toMatchObject({
      error: { code: 'PROJECT_HAS_ACTIVE_RUNS', details: { runIds: [reservation.runId] } },
    });
    expect(result.barriers.archive.pause).toHaveBeenCalledTimes(2);
    expect(runtime.createRun).toHaveBeenCalledTimes(1);
    expect(await prisma.project.findUnique({ where: { id: projectId } })).toMatchObject({
      status: ProjectStatus.ACTIVE,
    });
  });

  async function raceArchiveAndReservation(winner: 'archive' | 'reservation') {
    const barriers = installReadBarriers(transactions);
    runtime.createRun.mockImplementation(async ({ runId }) => ({ runId }));
    const admission = barriers.scope.run('reservation', startRun).then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    const archival = barriers.scope
      .run('archive', () => projects.archiveUserProject({ projectId }))
      .then(
        (value) => ({ value }),
        (error) => ({ error }),
      );

    try {
      await Promise.all([barriers.archive.entered, barriers.reservation.entered]);
      barriers[winner].release();
      await (winner === 'archive' ? archival : admission);
      barriers.archive.release();
      barriers.reservation.release();

      return { admission: await admission, archival: await archival, barriers };
    } finally {
      barriers.archive.release();
      barriers.reservation.release();
      await Promise.all([admission, archival]);
    }
  }
});

function createReadBarrier() {
  const entered = Promise.withResolvers<void>();
  const released = Promise.withResolvers<void>();

  return {
    entered: entered.promise,
    release: () => released.resolve(),
    pause: vi.fn<() => Promise<void>>(async () => {
      entered.resolve();
      await released.promise;
    }),
  };
}

function installReadBarriers(transactions: TransactionPrismaService) {
  const scope = new AsyncLocalStorage<'archive' | 'reservation'>();
  const archive = createReadBarrier();
  const reservation = createReadBarrier();
  const getTransaction = transactions.getTransaction.bind(transactions);
  vi.spyOn(transactions, 'getTransaction').mockImplementation(() => {
    const transaction = getTransaction();
    const operation = scope.getStore();

    return new Proxy(transaction, {
      get(target, property) {
        if (property === 'project' && operation === 'reservation') {
          return pauseAfterProjectLookup(target.project, reservation.pause);
        }

        if (property === 'projectRun' && operation === 'archive') {
          return pauseAfterOwnershipLookup(target.projectRun, archive.pause);
        }

        return Reflect.get(target, property);
      },
    });
  });

  return { scope, archive, reservation };
}

function pauseAfterProjectLookup(
  project: Prisma.TransactionClient['project'],
  pause: () => Promise<void>,
) {
  return new Proxy(project, {
    get(delegate, method) {
      if (method === 'findFirst') {
        return async (args: Prisma.ProjectFindFirstArgs) => {
          const result = await delegate.findFirst(args);
          await pause();

          return result;
        };
      }

      return Reflect.get(delegate, method);
    },
  });
}

function pauseAfterOwnershipLookup(
  projectRun: Prisma.TransactionClient['projectRun'],
  pause: () => Promise<void>,
) {
  return new Proxy(projectRun, {
    get(delegate, method) {
      if (method === 'findMany') {
        return async (args: Prisma.ProjectRunFindManyArgs) => {
          const result = await delegate.findMany(args);
          await pause();

          return result;
        };
      }

      return Reflect.get(delegate, method);
    },
  });
}
