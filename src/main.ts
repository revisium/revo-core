import 'reflect-metadata';
import { agentRuntimeConfig } from './config/agent-runtime.config.js';
import { databaseConfig } from './config/database.config.js';
import { httpConfig } from './config/http.config.js';
import { runConfig } from './config/run.config.js';
import { createRevoCoreRuntime } from './runtime/revo-core-runtime.js';

const bootstrap = async (): Promise<void> => {
  const databaseUrl = databaseConfig().url;
  if (databaseUrl === undefined || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL is required.');
  }

  const http = httpConfig();
  const run = runConfig();
  const agentRuntime = agentRuntimeConfig();
  const preparationController = new AbortController();
  const runtime = await createRevoCoreRuntime({
    databaseUrl,
    temporaryWorkingDirectoryRoot: run.temporaryWorkingDirectoryRoot,
    agentWorkspaceDirectory: agentRuntime.workspaceDirectory,
    inheritedEnvironmentNames: agentRuntime.inheritedEnvironmentNames,
  });

  let shutdownPromise: Promise<void> | undefined;
  const shutdown = (): Promise<void> => {
    preparationController.abort();
    shutdownPromise ??= runtime.close();
    return shutdownPromise;
  };
  const requestShutdown = (): void => {
    void shutdown().catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', requestShutdown);
  process.once('SIGTERM', requestShutdown);

  try {
    await runtime.prepareDatabase({ signal: preparationController.signal });
    await runtime.listen({ host: http.host, port: http.port });
  } catch (error) {
    await shutdown().catch((shutdownError: unknown) => console.error(shutdownError));
    throw error;
  }
};

await bootstrap();
