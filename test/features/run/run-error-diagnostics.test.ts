import { HttpException, Logger } from '@nestjs/common';
import { RunManagerError } from '@revisium/revo-run';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { PlaybookCatalogApiService } from '../../../src/features/playbook-catalog/playbook-catalog-api.service.js';
import { StartRunHandler } from '../../../src/features/run/commands/handlers/start-run.handler.js';
import { StartRunCommand } from '../../../src/features/run/commands/impl/start-run.command.js';
import { GetRunDetailsHandler } from '../../../src/features/run/queries/handlers/get-run-details.handler.js';
import { GetRunEventsHandler } from '../../../src/features/run/queries/handlers/get-run-events.handler.js';
import { GetRunHandler } from '../../../src/features/run/queries/handlers/get-run.handler.js';
import { GetRunDetailsQuery } from '../../../src/features/run/queries/impl/get-run-details.query.js';
import { GetRunEventsQuery } from '../../../src/features/run/queries/impl/get-run-events.query.js';
import { GetRunQuery } from '../../../src/features/run/queries/impl/get-run.query.js';
import type { RevoRunService } from '../../../src/features/run/revo-run.service.js';
import { taskPipeline, taskProfile } from '../../fixtures/task-pipeline.js';

afterEach(() => vi.restoreAllMocks());

describe('run library error diagnostics', () => {
  test('logs the original create failure once before public conversion', async () => {
    const error = new RunManagerError('run_admission_failed', { operation: 'workflow_start' });
    error.cause = new Error('provider password=private');
    const runs = runService({ createRun: vi.fn<() => Promise<never>>().mockRejectedValue(error) });
    const handler = new StartRunHandler({} as PlaybookCatalogApiService, runs);
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const result = handler.execute(
      new StartRunCommand({ pipeline: taskPipeline(), profile: taskProfile(), input: {} }),
    );

    await expect(result).rejects.toBeInstanceOf(HttpException);
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
    const handler = new StartRunHandler({} as PlaybookCatalogApiService, runs);
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(
      handler.execute(
        new StartRunCommand({ pipeline: taskPipeline(), profile: taskProfile(), input: {} }),
      ),
    ).rejects.toBeInstanceOf(HttpException);
    expect(logged).not.toHaveBeenCalled();
  });

  test.each([
    {
      operation: 'run.get',
      execute: (runs: RevoRunService) =>
        new GetRunHandler(runs).execute(new GetRunQuery({ runId: 'r_read' })),
      method: 'getRun',
      libraryOperation: 'get_run',
    },
    {
      operation: 'run.details.get',
      execute: (runs: RevoRunService) =>
        new GetRunDetailsHandler(runs).execute(new GetRunDetailsQuery({ runId: 'r_read' })),
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
        response: {
          statusCode: 503,
          code: 'run_read_failed',
          message: 'Run observation could not be read.',
          path: null,
          details: { runId: 'r_read', operation: input.libraryOperation },
        },
      });
      expect(logged).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ operation: input.operation, runId: 'r_read' }),
      );
    },
  );
});

function runService(methods: Partial<Record<keyof RevoRunService, unknown>>): RevoRunService {
  return methods as RevoRunService;
}
