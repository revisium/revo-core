import { Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createRunManager,
  type RunManager,
  type RunSnapshot,
  type StartRunInput,
  type StartRunResult,
} from '@revisium/revo-run';

import { MvpRunExecutor } from './mvp-run-executor.js';

@Injectable()
export class RevoRunService implements OnModuleInit, OnApplicationShutdown {
  private readonly manager: RunManager;

  constructor(config: ConfigService, executor: MvpRunExecutor) {
    this.manager = createRunManager({
      database: { url: config.getOrThrow<string>('database.url') },
      executor,
    });
  }

  onModuleInit(): Promise<void> {
    return this.manager.start();
  }

  onApplicationShutdown(): Promise<void> {
    return this.manager.stop();
  }

  startRun(input: StartRunInput): Promise<StartRunResult> {
    return this.manager.startRun(input);
  }

  getRun(runId: string): Promise<RunSnapshot | undefined> {
    return this.manager.getRun(runId);
  }
}
