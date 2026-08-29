import { Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createRunManager,
  type CreateRunResult,
  type JsonValue,
  type RunManager,
  type RunSnapshot,
} from '@revisium/revo-run';

type UnvalidatedCreateRunInput = Readonly<{
  runId: string;
  pipeline: unknown;
  profile: unknown;
  input: JsonValue;
}>;

type ValidatingRunManager = Omit<RunManager, 'createRun'> & {
  createRun(input: UnvalidatedCreateRunInput): Promise<CreateRunResult>;
};

@Injectable()
export class RevoRunService implements OnModuleInit, OnApplicationShutdown {
  private manager: ValidatingRunManager | undefined;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): Promise<void> {
    return this.start();
  }

  private async start(): Promise<void> {
    if (this.manager !== undefined) {
      return;
    }
    this.manager = createRunManager({
      database: { url: this.config.getOrThrow<string>('database.url') },
      host: {
        resources: {
          inspect: () => Promise.resolve(undefined),
        },
        workspaces: {
          inspect: () => Promise.resolve(undefined),
          acquire: () => Promise.reject(new Error('Run workspaces are unavailable.')),
        },
        credentials: {
          inspect: () => Promise.resolve(undefined),
          acquire: () => Promise.reject(new Error('Run credentials are unavailable.')),
        },
      },
    });
    await this.manager.start();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.manager?.stop();
    this.manager = undefined;
  }

  startRun(input: UnvalidatedCreateRunInput): Promise<CreateRunResult> {
    return this.getManager().createRun(input);
  }

  getRun(runId: string): Promise<RunSnapshot | undefined> {
    return this.getManager().getRun(runId);
  }

  private getManager(): ValidatingRunManager {
    if (this.manager === undefined) {
      throw new Error('Run manager is not started.');
    }
    return this.manager;
  }
}
