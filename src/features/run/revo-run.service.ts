import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AgentManager, AgentDefinitionInput } from '@revisium/revo-agent-runtime';
import {
  createRunManager,
  createAgentAttemptExecutionAdapter,
  type AgentAttemptExecutionAdapter,
  type CreateRunInput,
  type CreateRunResult,
  type RunDetails,
  type RunEventPage,
  type RunEventPageInput,
  type RunManager,
  type RunSnapshot,
} from '@revisium/revo-run';

import { AgentRuntimeLifecycle } from '../../infrastructure/agent-runtime/agent-runtime-lifecycle.js';
import {
  AGENT_MANAGER,
  AGENT_DEFINITIONS,
} from '../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import { RunWorkingDirectoryCoordinator } from './infrastructure/working-directory/run-working-directory-coordinator.js';
import { TemporaryRunDirectoryHost } from './infrastructure/working-directory/temporary-run-directory-host.js';

@Injectable()
export class RevoRunService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RevoRunService.name);
  private manager?: RunManager;
  private attemptAdapter?: AgentAttemptExecutionAdapter;
  private workingDirectoryCoordinator?: RunWorkingDirectoryCoordinator;

  constructor(
    private readonly config: ConfigService,
    private readonly workingDirectoryHost: TemporaryRunDirectoryHost,
    @Inject(AGENT_MANAGER) private readonly agents: AgentManager,
    @Inject(AGENT_DEFINITIONS) private readonly definitions: readonly AgentDefinitionInput[],
    private readonly runtimeLifecycle: AgentRuntimeLifecycle,
  ) {}

  async onModuleInit(): Promise<void> {
    this.attemptAdapter = createAgentAttemptExecutionAdapter({
      manager: this.agents,
      definitions: this.definitions,
      host: this.workingDirectoryHost,
    });
    this.manager = createRunManager({
      database: { url: this.config.getOrThrow<string>('database.url') },
      host: this.workingDirectoryHost,
      agents: this.attemptAdapter,
    });
    this.workingDirectoryCoordinator = new RunWorkingDirectoryCoordinator(
      this.manager,
      this.workingDirectoryHost,
      (error) => this.logger.error('Temporary run working directory cleanup failed.', error),
    );
    await this.manager.start();
  }

  async onApplicationShutdown(): Promise<void> {
    this.workingDirectoryCoordinator?.beginShutdown();
    const failures: unknown[] = [];
    const runtimeStopped = await this.captureShutdownFailure(
      () => this.runtimeLifecycle.stop(),
      failures,
    );
    const runStopped = await this.captureShutdownFailure(
      () => this.manager?.stop() ?? Promise.resolve(),
      failures,
    );

    if (runtimeStopped && runStopped) {
      await this.captureShutdownFailure(
        () => this.workingDirectoryCoordinator?.waitForCleanup() ?? Promise.resolve(),
        failures,
      );
      await this.captureShutdownFailure(
        () =>
          this.workingDirectoryCoordinator?.cleanupAllocatedWorkingDirectories() ??
          Promise.resolve(),
        failures,
      );
    } else {
      this.logger.error(
        'Execution did not quiesce; temporary working directories were retained for safety.',
      );
    }
    if (runtimeStopped) {
      await this.captureShutdownFailure(
        () => this.attemptAdapter?.shutdown('revo_core_shutdown') ?? Promise.resolve(),
        failures,
      );
      await this.captureShutdownFailure(() => this.runtimeLifecycle.cleanup(), failures);
    }

    if (failures.length > 0) {
      throw new AggregateError(failures, 'Run host shutdown failed.');
    }
  }

  private async captureShutdownFailure(
    operation: () => Promise<void>,
    failures: unknown[],
  ): Promise<boolean> {
    try {
      await operation();

      return true;
    } catch (error) {
      failures.push(error);

      return false;
    }
  }

  createRun(input: CreateRunInput): Promise<CreateRunResult> {
    return this.requireCoordinator().createRun(input);
  }

  getRun(runId: string): Promise<RunSnapshot | undefined> {
    return this.requireManager().getRun(runId);
  }

  getRunDetails(runId: string): Promise<RunDetails | undefined> {
    return this.requireManager().getRunDetails(runId);
  }

  getRunEvents(runId: string, page?: RunEventPageInput): Promise<RunEventPage> {
    return this.requireManager().getRunEvents(runId, page);
  }

  private requireManager(): RunManager {
    if (this.manager === undefined) {
      throw new Error('Run manager is not initialized.');
    }

    return this.manager;
  }

  private requireCoordinator(): RunWorkingDirectoryCoordinator {
    if (this.workingDirectoryCoordinator === undefined) {
      throw new Error('Run working directory coordinator is not initialized.');
    }

    return this.workingDirectoryCoordinator;
  }
}
