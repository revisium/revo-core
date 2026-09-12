import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { defaultInheritedEnvironmentNames } from '../config/agent-runtime.config.js';
import type { RevoCoreRuntimeOptions } from './revo-core-runtime.types.js';

export interface RevoCoreApplicationConfiguration {
  readonly database: { readonly url: string };
  readonly run: { readonly temporaryWorkingDirectoryRoot: string };
  readonly agentRuntime: {
    readonly workspaceDirectory: string;
    readonly inheritedEnvironmentNames: readonly string[];
  };
}

export const resolveRuntimeConfiguration = (
  options: RevoCoreRuntimeOptions,
): RevoCoreApplicationConfiguration => {
  if (options.databaseUrl.trim() === '') {
    throw new TypeError('databaseUrl must not be empty.');
  }

  return {
    database: { url: options.databaseUrl },
    run: {
      temporaryWorkingDirectoryRoot: resolve(
        options.temporaryWorkingDirectoryRoot ?? join(homedir(), '.revo', 'work'),
      ),
    },
    agentRuntime: {
      workspaceDirectory: resolve(
        options.agentWorkspaceDirectory ?? join(homedir(), '.revo', 'sessions'),
      ),
      inheritedEnvironmentNames:
        options.inheritedEnvironmentNames ?? defaultInheritedEnvironmentNames(),
    },
  };
};
