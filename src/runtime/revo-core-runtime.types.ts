import type { LoggerService, LogLevel } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

export type RevoCoreLifecycleStage =
  | 'application-database-migrations'
  | 'dbos-system-migrations'
  | 'application-bootstrap'
  | 'api-readiness';

export type RevoCoreLifecycleEvent =
  | {
      readonly stage: RevoCoreLifecycleStage;
      readonly status: 'started' | 'completed';
    }
  | {
      readonly stage: RevoCoreLifecycleStage;
      readonly status: 'failed';
      readonly error: unknown;
    };

export interface RevoCoreRuntimeOptions {
  readonly databaseUrl: string;
  readonly logger?: LoggerService | LogLevel[] | false;
  readonly temporaryWorkingDirectoryRoot?: string;
  readonly agentWorkspaceDirectory?: string;
  readonly inheritedEnvironmentNames?: readonly string[];
  readonly onStage?: (event: RevoCoreLifecycleEvent) => void;
}

export interface RevoCoreDatabasePreparationOptions {
  readonly signal?: AbortSignal;
}

export interface RevoCoreListenOptions {
  readonly host: string;
  readonly port: number;
}

export interface RevoCoreListenResult {
  readonly host: string;
  readonly port: number;
  readonly url: string;
}

export interface RevoCoreRuntime {
  readonly app: NestExpressApplication;

  configureAfterCoreRoutes(configure: (app: NestExpressApplication) => void): void;
  prepareDatabase(options?: RevoCoreDatabasePreparationOptions): Promise<void>;
  initialize(): Promise<void>;
  listen(options: RevoCoreListenOptions): Promise<RevoCoreListenResult>;
  close(): Promise<void>;
}
