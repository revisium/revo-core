import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  AgentManagerError,
  type AgentConfigurationCatalog,
  type AgentManager,
  type AgentStartContext,
} from '@revisium/revo-agent-runtime';

import {
  AGENT_LAUNCH_CONTEXT,
  AGENT_MANAGER,
} from '../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../../infrastructure/agent-runtime/agent-session-directories.js';
import { reportErrorDiagnostic } from '../../../infrastructure/error-diagnostic.js';
import { AgentConfigurationCache } from './agent-configuration-cache.js';

type ConfigurationManager = Pick<AgentManager, 'inspectConfiguration'> & {
  readonly sessions: Pick<AgentManager['sessions'], 'listAgents'>;
};
type Agent = AgentConfigurationCatalog['agent'];

@Injectable()
export class AgentConfigurationWarmup implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentConfigurationWarmup.name);
  private readonly controller = new AbortController();
  private started = false;

  constructor(
    @Inject(AGENT_MANAGER) private readonly manager: ConfigurationManager,
    @Inject(AGENT_LAUNCH_CONTEXT) private readonly context: AgentStartContext,
    private readonly directories: AgentSessionDirectories,
    private readonly cache: AgentConfigurationCache,
  ) {}

  onModuleInit(): void {
    if (this.started || this.controller.signal.aborted) {
      return;
    }
    this.started = true;
    const agents = new Map(
      this.manager.sessions
        .listAgents()
        .map(({ agent }) => [JSON.stringify([agent.id, agent.version]), agent]),
    );
    this.cache.begin();
    void this.run([...agents.values()]);
  }

  onModuleDestroy(): void {
    this.controller.abort();
  }

  private async run(agents: readonly Agent[]): Promise<void> {
    const pending = agents.values();
    const catalogs: AgentConfigurationCatalog[] = [];
    await Promise.all([this.drain(pending, catalogs), this.drain(pending, catalogs)]);

    if (!this.controller.signal.aborted) {
      catalogs.sort((left, right) =>
        JSON.stringify([left.agent.id, left.agent.version]).localeCompare(
          JSON.stringify([right.agent.id, right.agent.version]),
        ),
      );
      this.cache.publish(catalogs);
    }
  }

  private async drain(
    pending: Iterator<Agent>,
    catalogs: AgentConfigurationCatalog[],
  ): Promise<void> {
    if (this.controller.signal.aborted) {
      return;
    }

    const next = pending.next();

    if (next.done) {
      return;
    }

    const catalog = await this.inspect(next.value);

    if (catalog !== undefined) {
      catalogs.push(catalog);
    }

    return this.drain(pending, catalogs);
  }

  private async inspect(agent: Agent): Promise<AgentConfigurationCatalog | undefined> {
    try {
      return await this.manager.inspectConfiguration(
        { agent, workspace: { directory: this.directories.workspaceDirectory } },
        { ...this.context, signal: this.controller.signal },
      );
    } catch (error) {
      if (!this.controller.signal.aborted) {
        reportErrorDiagnostic(
          this.logger,
          {
            operation: 'agent.configuration.inspect',
            agentId: agent.id,
            agentVersion: agent.version,
            ...(error instanceof AgentManagerError
              ? {
                  runtimeCode: error.fault.code,
                  phase: error.fault.phase,
                  retryable: error.fault.retryable,
                }
              : {}),
          },
          error,
        );
      }

      return undefined;
    }
  }
}
