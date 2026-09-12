import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { RevoRunService } from '../../src/features/run/revo-run.service.js';
import {
  createRevoCoreRuntime,
  type RevoCoreLifecycleEvent,
  type RevoCoreRuntime,
} from '../../src/index.js';
import { IsolatedRuntimeDatabase } from '../support/runtime/isolated-runtime-database.js';

interface FallbackRequest {
  readonly path: string;
}

interface FallbackResponse {
  status(code: number): FallbackResponse;
  send(body: string): void;
}

type FallbackNext = (error?: unknown) => void;

describe('public Revo Core runtime', () => {
  let database: IsolatedRuntimeDatabase;
  let runtimeRoot: string;
  const openRuntimes: RevoCoreRuntime[] = [];

  beforeAll(async () => {
    database = await IsolatedRuntimeDatabase.create();
    runtimeRoot = await mkdtemp(join(tmpdir(), 'revo-core-runtime-'));
  });

  afterAll(async () => {
    await Promise.allSettled(openRuntimes.map((runtime) => runtime.close()));
    await database?.drop();
    if (runtimeRoot !== undefined) {
      await rm(runtimeRoot, { recursive: true, force: true });
    }
  });

  test('prepares a fresh database and composes API routes with an SPA fallback', async () => {
    const events: RevoCoreLifecycleEvent[] = [];
    const hangingRequestEntered = Promise.withResolvers<void>();
    const runtime = await createRuntime((event) => events.push(event));

    runtime.configureAfterCoreRoutes((app) => {
      app.use((incoming: FallbackRequest, response: FallbackResponse, next: FallbackNext) => {
        if (incoming.path === '/browser/route') {
          response.status(200).send('admin fallback');
          return;
        }
        if (incoming.path === '/fallback-error') {
          next(new Error('fallback failed'));
          return;
        }
        if (incoming.path === '/hanging') {
          hangingRequestEntered.resolve();
          return;
        }
        next();
      });
    });

    const preparation = runtime.prepareDatabase();
    expect(runtime.prepareDatabase()).toBe(preparation);
    await preparation;
    await expect(database.relations()).resolves.toEqual({
      prismaMigrations: '_prisma_migrations',
      dbosWorkflowStatus: 'dbos.workflow_status',
    });

    const listening = await runtime.listen({ host: '127.0.0.1', port: 0 });
    const server = runtime.app.getHttpServer();
    expect(listening.port).toBeGreaterThan(0);
    expect(listening.url).toBe(`http://127.0.0.1:${listening.port}`);

    await request(server).get('/api/system').expect(200, { name: 'revo-core', status: 'ok' });
    await request(server)
      .post('/graphql')
      .send({ query: 'query { systemInfo { name status } }' })
      .expect(200, { data: { systemInfo: { name: 'revo-core', status: 'ok' } } });
    await request(server).get('/browser/route').expect(200, 'admin fallback');
    await request(server).get('/not-a-route').expect(404);
    await request(server).get('/fallback-error').expect(500);

    expect(events.map(({ stage, status }) => `${status}:${stage}`)).toEqual([
      'started:application-database-migrations',
      'completed:application-database-migrations',
      'started:dbos-system-migrations',
      'completed:dbos-system-migrations',
      'started:application-bootstrap',
      'completed:application-bootstrap',
      'started:api-readiness',
      'completed:api-readiness',
    ]);

    const hangingRequest = fetch(`${listening.url}/hanging`).catch((error: unknown) => error);
    await hangingRequestEntered.promise;
    const quiesce = vi.spyOn(runtime.app.get(RevoRunService, { strict: false }), 'quiesce');
    const nestClose = vi.spyOn(runtime.app, 'close');
    const closing = runtime.close();
    expect(runtime.close()).toBe(closing);
    await closing;
    await expect(hangingRequest).resolves.toBeInstanceOf(Error);
    const quiesceOrder = quiesce.mock.invocationCallOrder[0];
    const nestCloseOrder = nestClose.mock.invocationCallOrder[0];
    if (quiesceOrder === undefined || nestCloseOrder === undefined) {
      throw new Error('Expected both shutdown operations to run.');
    }
    expect(quiesceOrder).toBeLessThan(nestCloseOrder);
  }, 30_000);

  test('starts again without losing prepared application data', async () => {
    const sentinel = {
      id: 'runtime-restart-sentinel',
      name: 'Preserved project',
      description: 'Created before repeated database preparation',
    };
    await database.insertProject(sentinel);
    const runtime = await createRuntime(() => {
      throw new Error('observer failures must not affect startup');
    });
    const listening = await runtime.listen({ host: '127.0.0.1', port: 0 });

    await request(runtime.app.getHttpServer())
      .get('/api/system')
      .expect(200, { name: 'revo-core', status: 'ok' });
    await expect(database.project(sentinel.id)).resolves.toEqual({
      name: sentinel.name,
      description: sentinel.description,
    });
    expect(listening.port).toBeGreaterThan(0);

    await runtime.close();
  }, 30_000);

  test('closes safely before initialization', async () => {
    const runtime = await createRuntime();
    await runtime.close();
    expect(() => runtime.initialize()).toThrow('closing or closed');
  });

  test('can retry preparation after a caller aborts one attempt', async () => {
    const controller = new AbortController();
    controller.abort();
    const runtime = await createRuntime();

    await expect(runtime.prepareDatabase({ signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    await expect(runtime.prepareDatabase()).resolves.toBeUndefined();
    await runtime.close();
  });

  async function createRuntime(
    onStage?: (event: RevoCoreLifecycleEvent) => void,
  ): Promise<RevoCoreRuntime> {
    const runtime = await createRevoCoreRuntime({
      databaseUrl: database.url,
      logger: false,
      temporaryWorkingDirectoryRoot: join(runtimeRoot, 'work'),
      agentWorkspaceDirectory: join(runtimeRoot, 'agents'),
      ...(onStage === undefined ? {} : { onStage }),
    });
    openRuntimes.push(runtime);
    return runtime;
  }
});
