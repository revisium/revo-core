import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { prepareRunManagerDatabase } from '@revisium/revo-run';

import { initSwagger } from '../api/rest/swagger.js';
import { RevoRunService } from '../features/run/revo-run.service.js';
import { createWithEngineDatabaseUrl } from './engine-database-environment.js';
import { prepareApplicationDatabase } from './prepare-application-database.js';
import { RevoCoreExpressAdapter } from './revo-core-express-adapter.js';
import { RevoCoreRootModule } from './revo-core-root.module.js';
import type {
  RevoCoreDatabasePreparationOptions,
  RevoCoreLifecycleEvent,
  RevoCoreLifecycleStage,
  RevoCoreListenOptions,
  RevoCoreListenResult,
  RevoCoreRuntime,
  RevoCoreRuntimeOptions,
} from './revo-core-runtime.types.js';
import {
  resolveRuntimeConfiguration,
  type RevoCoreApplicationConfiguration,
} from './runtime-configuration.js';

let initializedRuntime: symbol | undefined;

const formatUrlHost = (host: string): string => (host.includes(':') ? `[${host}]` : host);

class RevoCoreRuntimeImplementation implements RevoCoreRuntime {
  private readonly afterCoreConfigurations: Array<(app: NestExpressApplication) => void> = [];
  private readonly eventLogger = new Logger('RevoCoreRuntime');
  private readonly identity = Symbol('RevoCoreRuntime');
  private prepared = false;
  private initialized = false;
  private closing = false;
  private preparationPromise: Promise<void> | undefined;
  private activePreparationController: AbortController | undefined;
  private initializationPromise: Promise<void> | undefined;
  private listenPromise: Promise<RevoCoreListenResult> | undefined;
  private closePromise: Promise<void> | undefined;

  constructor(
    readonly app: NestExpressApplication,
    private readonly adapter: RevoCoreExpressAdapter,
    private readonly configuration: RevoCoreApplicationConfiguration,
    private readonly options: RevoCoreRuntimeOptions,
  ) {
    adapter.setAfterCoreRoutesInstaller(() => {
      for (const configure of this.afterCoreConfigurations) {
        configure(app);
      }
    });
  }

  configureAfterCoreRoutes(configure: (app: NestExpressApplication) => void): void {
    this.assertOpen();
    if (this.initializationPromise !== undefined || this.initialized) {
      throw new Error('After-core routes must be configured before initialization.');
    }

    this.afterCoreConfigurations.push(configure);
  }

  prepareDatabase(options: RevoCoreDatabasePreparationOptions = {}): Promise<void> {
    this.assertOpen();
    if (this.prepared) {
      return Promise.resolve();
    }
    if (this.preparationPromise !== undefined) {
      return this.preparationPromise;
    }

    const controller = new AbortController();
    this.activePreparationController = controller;
    const removeExternalAbortListener = this.followAbortSignal(options.signal, controller);
    const preparation = this.prepareDatabaseOnce(controller.signal)
      .then(() => {
        this.prepared = true;
      })
      .finally(() => {
        removeExternalAbortListener();
        this.activePreparationController = undefined;
        if (!this.prepared) {
          this.preparationPromise = undefined;
        }
      });
    this.preparationPromise = preparation;

    return preparation;
  }

  initialize(): Promise<void> {
    this.assertOpen();
    if (this.initialized) {
      return Promise.resolve();
    }
    if (this.initializationPromise !== undefined) {
      return this.initializationPromise;
    }

    const initialization = this.initializeOnce();
    this.initializationPromise = initialization;

    return initialization;
  }

  listen(options: RevoCoreListenOptions): Promise<RevoCoreListenResult> {
    this.assertOpen();
    this.assertListenOptions(options);
    if (this.listenPromise !== undefined) {
      return this.listenPromise;
    }

    const listening = this.listenOnce(options).catch((error: unknown) => {
      this.listenPromise = undefined;
      throw error;
    });
    this.listenPromise = listening;

    return listening;
  }

  close(): Promise<void> {
    this.closePromise ??= this.closeOnce();
    return this.closePromise;
  }

  private async prepareDatabaseOnce(signal: AbortSignal): Promise<void> {
    await this.runStage('application-database-migrations', () =>
      prepareApplicationDatabase(this.configuration.database.url, signal),
    );
    await this.runStage('dbos-system-migrations', async () => {
      await prepareRunManagerDatabase({
        databaseUrl: this.configuration.database.url,
        signal,
      });
    });
  }

  private async initializeOnce(): Promise<void> {
    await this.prepareDatabase();
    this.assertOpen();
    if (initializedRuntime !== undefined && initializedRuntime !== this.identity) {
      throw new Error('Only one initialized Revo Core runtime is supported per process.');
    }

    initializedRuntime = this.identity;
    try {
      await this.runStage('application-bootstrap', () => this.app.init().then(() => undefined));
      this.initialized = true;
    } catch (error) {
      if (initializedRuntime === this.identity) {
        initializedRuntime = undefined;
      }
      throw error;
    }
  }

  private async listenOnce(options: RevoCoreListenOptions): Promise<RevoCoreListenResult> {
    await this.initialize();
    this.assertOpen();

    return this.runStage('api-readiness', async () => {
      await this.app.listen(options.port, options.host);
      const address = this.adapter.getHttpServer().address();
      if (address === null || typeof address === 'string') {
        throw new Error('Revo Core listener did not expose its bound address.');
      }

      return {
        host: options.host,
        port: address.port,
        url: `http://${formatUrlHost(options.host)}:${address.port}`,
      };
    });
  }

  private async closeOnce(): Promise<void> {
    this.closing = true;
    this.activePreparationController?.abort();
    this.adapter.beginShutdown();

    const transitions = [
      this.preparationPromise,
      this.initializationPromise,
      this.listenPromise,
    ].filter((operation) => operation !== undefined);
    await Promise.allSettled(transitions);

    const failures: unknown[] = [];
    const serverClose = this.adapter.beginServerClose();
    await this.captureCleanupFailure(
      () => this.app.get(RevoRunService, { strict: false }).quiesce(),
      failures,
    );
    await this.captureCleanupFailure(() => this.app.close(), failures);
    await this.captureCleanupFailure(() => serverClose, failures);

    if (failures.length === 0 && initializedRuntime === this.identity) {
      initializedRuntime = undefined;
    }
    if (failures.length === 1) {
      throw failures[0];
    }
    if (failures.length > 1) {
      throw new AggregateError(failures, 'Revo Core shutdown failed.');
    }
  }

  private async captureCleanupFailure(
    cleanup: () => Promise<void>,
    failures: unknown[],
  ): Promise<void> {
    try {
      await cleanup();
    } catch (error) {
      failures.push(error);
    }
  }

  private async runStage<T>(
    stage: RevoCoreLifecycleStage,
    operation: () => Promise<T>,
  ): Promise<T> {
    this.emit({ stage, status: 'started' });
    try {
      const result = await operation();
      this.emit({ stage, status: 'completed' });
      return result;
    } catch (error) {
      this.emit({ stage, status: 'failed', error });
      throw error;
    }
  }

  private emit(event: RevoCoreLifecycleEvent): void {
    try {
      this.options.onStage?.(event);
    } catch (error) {
      this.reportObserverFailure(error);
    }
  }

  private reportObserverFailure(error: unknown): void {
    try {
      const logger = this.options.logger;
      if (typeof logger === 'object' && logger !== null && 'error' in logger) {
        logger.error('Revo Core lifecycle observer failed.', error);
      } else if (logger !== false) {
        this.eventLogger.error('Revo Core lifecycle observer failed.', error);
      }
    } catch {
      // Logging is observational and must not change lifecycle outcomes.
    }
  }

  private followAbortSignal(
    signal: AbortSignal | undefined,
    controller: AbortController,
  ): () => void {
    if (signal === undefined) {
      return () => undefined;
    }
    const abort = (): void => controller.abort(signal.reason);
    if (signal.aborted) {
      abort();
      return () => undefined;
    }

    signal.addEventListener('abort', abort, { once: true });
    return () => signal.removeEventListener('abort', abort);
  }

  private assertOpen(): void {
    if (this.closing) {
      throw new Error('Revo Core runtime is closing or closed.');
    }
  }

  private assertListenOptions(options: RevoCoreListenOptions): void {
    if (options.host.trim() === '') {
      throw new TypeError('host must not be empty.');
    }
    if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65_535) {
      throw new TypeError('port must be an integer between 0 and 65535.');
    }
  }
}

export const createRevoCoreRuntime = async (
  options: RevoCoreRuntimeOptions,
): Promise<RevoCoreRuntime> => {
  const configuration = resolveRuntimeConfiguration(options);
  const adapter = new RevoCoreExpressAdapter();
  const app = await createWithEngineDatabaseUrl(options.databaseUrl, () =>
    NestFactory.create<NestExpressApplication>(
      RevoCoreRootModule.configure(configuration),
      adapter,
      {
        abortOnError: false,
        forceCloseConnections: true,
        ...(options.logger === undefined ? {} : { logger: options.logger }),
      },
    ),
  );
  initSwagger(app);

  return new RevoCoreRuntimeImplementation(app, adapter, configuration, options);
};
