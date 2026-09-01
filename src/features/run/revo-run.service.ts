import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createRunManager,
  type CreateRunInput,
  type CreateRunResult,
  type RunDetails,
  type RunEventPage,
  type RunEventPageInput,
  type RunManager,
  type RunSnapshot,
} from '@revisium/revo-run';

import { RunWorkingDirectoryCoordinator } from './infrastructure/working-directory/run-working-directory-coordinator.js';
import { TemporaryRunDirectoryHost } from './infrastructure/working-directory/temporary-run-directory-host.js';

@Injectable()
export class RevoRunService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RevoRunService.name);
  private readonly manager: RunManager;
  private readonly workingDirectoryCoordinator: RunWorkingDirectoryCoordinator;

  constructor(config: ConfigService, workingDirectoryHost: TemporaryRunDirectoryHost) {
    this.manager = createRunManager({
      database: { url: config.getOrThrow<string>('database.url') },
      host: workingDirectoryHost,
    });
    this.workingDirectoryCoordinator = new RunWorkingDirectoryCoordinator(
      this.manager,
      workingDirectoryHost,
      (error) => this.logger.error('Temporary run working directory cleanup failed.', error),
    );
  }

  onModuleInit(): Promise<void> {
    return this.manager.start();
  }

  async onApplicationShutdown(): Promise<void> {
    this.workingDirectoryCoordinator.beginShutdown();
    await this.manager.stop();
    await this.workingDirectoryCoordinator.waitForCleanup();
  }

  createRun(input: CreateRunInput): Promise<CreateRunResult> {
    return this.workingDirectoryCoordinator.createRun(input);
  }

  getRun(runId: string): Promise<RunSnapshot | undefined> {
    return this.manager.getRun(runId);
  }

  getRunDetails(runId: string): Promise<RunDetails | undefined> {
    return this.manager.getRunDetails(runId);
  }

  getRunEvents(runId: string, page?: RunEventPageInput): Promise<RunEventPage> {
    return this.manager.getRunEvents(runId, page);
  }
}
