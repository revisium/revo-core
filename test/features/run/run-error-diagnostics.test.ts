import { Logger } from '@nestjs/common';
import { RunManagerError, type RunDetails, type RunSnapshot } from '@revisium/revo-run';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ApplicationError } from '../../../src/application/errors/application-error.js';
import type { PlaybookCatalogApiService } from '../../../src/features/playbook-catalog/playbook-catalog-api.service.js';
import type { ProjectApiService } from '../../../src/features/project/project-api.service.js';
import { StartRunHandler } from '../../../src/features/run/commands/handlers/start-run.handler.js';
import { StartRunCommand } from '../../../src/features/run/commands/impl/start-run.command.js';
import { GetRunDetailsHandler } from '../../../src/features/run/queries/handlers/get-run-details.handler.js';
import { GetRunEventsHandler } from '../../../src/features/run/queries/handlers/get-run-events.handler.js';
import { GetRunHandler } from '../../../src/features/run/queries/handlers/get-run.handler.js';
import { GetRunDetailsQuery } from '../../../src/features/run/queries/impl/get-run-details.query.js';
import { GetRunEventsQuery } from '../../../src/features/run/queries/impl/get-run-events.query.js';
import { GetRunQuery } from '../../../src/features/run/queries/impl/get-run.query.js';
import type { RevoRunService } from '../../../src/infrastructure/run-runtime/revo-run.service.js';
import { taskPipeline, taskProfile } from '../../fixtures/task-pipeline.js';

afterEach(() => vi.restoreAllMocks());

describe('run library error diagnostics', () => {
  test('logs the original create failure once before public conversion', async () => {
    const error = new RunManagerError('run_admission_failed', { operation: 'workflow_start' });
    error.cause = new Error('provider password=private');
    const runs = runService({ createRun: vi.fn<() => Promise<never>>().mockRejectedValue(error) });
    const handler = new StartRunHandler({} as PlaybookCatalogApiService, projectService(), runs);
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const result = handler.execute(
      new StartRunCommand({
        projectId: 'project',
        pipeline: taskPipeline(),
        profile: taskProfile(),
        input: {},
      }),
    );

    await expect(result).rejects.toBeInstanceOf(ApplicationError);
    expect(logged).toHaveBeenCalledTimes(1);
    expect(logged.mock.calls[0]?.[0]).toMatchObject({
      operation: 'run.create',
      runId: expect.any(String),
      error: {
        name: 'RunManagerError',
        message: 'Run admission failed.',
        cause: { message: 'provider password=[REDACTED]' },
      },
    });
  });

  test('does not log an expected invalid create request', async () => {
    const error = new RunManagerError('invalid_create_run_input', {
      path: '/input',
      reason: 'invalid',
    });
    const runs = runService({ createRun: vi.fn<() => Promise<never>>().mockRejectedValue(error) });
    const handler = new StartRunHandler({} as PlaybookCatalogApiService, projectService(), runs);
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(
      handler.execute(
        new StartRunCommand({
          projectId: 'project',
          pipeline: taskPipeline(),
          profile: taskProfile(),
          input: {},
        }),
      ),
    ).rejects.toBeInstanceOf(ApplicationError);
    expect(logged).not.toHaveBeenCalled();
  });

  test.each([
    {
      operation: 'run.get',
      execute: (runs: RevoRunService) =>
        new GetRunHandler(runs, projectService()).execute(new GetRunQuery({ runId: 'r_read' })),
      method: 'getRun',
      libraryOperation: 'get_run',
    },
    {
      operation: 'run.details.get',
      execute: (runs: RevoRunService) =>
        new GetRunDetailsHandler(runs, projectService()).execute(
          new GetRunDetailsQuery({ runId: 'r_read' }),
        ),
      method: 'getRunDetails',
      libraryOperation: 'get_details',
    },
    {
      operation: 'run.events.get',
      execute: (runs: RevoRunService) =>
        new GetRunEventsHandler(runs).execute(new GetRunEventsQuery({ runId: 'r_read' })),
      method: 'getRunEvents',
      libraryOperation: 'get_events',
    },
  ] as const)(
    'logs one $operation failure before preserving its public contract',
    async (input) => {
      const error = new RunManagerError('run_read_failed', {
        runId: 'r_read',
        operation: input.libraryOperation,
      });
      const method = vi.fn<() => Promise<never>>().mockRejectedValue(error);
      const runs = runService({ [input.method]: method });
      const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      const result = input.execute(runs);

      await expect(result).rejects.toMatchObject({
        failure: {
          code: 'run_read_failed',
          details: { runId: 'r_read', operation: input.libraryOperation },
        },
      });
      expect(logged).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ operation: input.operation, runId: 'r_read' }),
      );
    },
  );

  test.each([
    {
      operation: 'snapshot',
      execute: (runs: RevoRunService, projects: ProjectApiService) =>
        new GetRunHandler(runs, projects).execute(new GetRunQuery({ runId: 'r_read' })),
    },
    {
      operation: 'details',
      execute: (runs: RevoRunService, projects: ProjectApiService) =>
        new GetRunDetailsHandler(runs, projects).execute(
          new GetRunDetailsQuery({ runId: 'r_read' }),
        ),
    },
  ])('preserves ownership lookup failures after reading the $operation', async ({ execute }) => {
    const snapshot: RunSnapshot = {
      schemaVersion: 'run-snapshot/v1',
      runId: 'r_read',
      status: 'running',
      createdAt: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-09-15T00:00:00.000Z',
      terminal: null,
    };
    const details: RunDetails = {
      ...snapshot,
      schemaVersion: 'run-details/v1',
      activities: [],
      operations: [],
      attempts: [],
      waits: [],
      gates: [],
      recovery: [],
    };
    const runs = runService({
      getRun: async () => snapshot,
      getRunDetails: async () => details,
    });
    const projects = projectService();
    const ownershipError = new Error('ownership lookup unavailable');
    vi.spyOn(projects, 'getRunProjectId').mockRejectedValue(ownershipError);
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(execute(runs, projects)).rejects.toBe(ownershipError);
    expect(logged).not.toHaveBeenCalled();
  });
});

function runService(methods: Partial<RevoRunService>): RevoRunService {
  return methods as RevoRunService;
}

function projectService(): ProjectApiService {
  return {
    reserveRun: vi.fn<() => Promise<void>>().mockResolvedValue(),
    releaseRun: vi.fn<() => Promise<void>>().mockResolvedValue(),
    getRunProjectId: vi.fn<() => Promise<null>>().mockResolvedValue(null),
  } as unknown as ProjectApiService;
}
