import { Inject, Logger } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import {
  AgentManagerError,
  type AgentManager,
  type AgentStartContext,
} from '@revisium/revo-agent-runtime';

import {
  AGENT_MANAGER,
  AGENT_LAUNCH_CONTEXT,
} from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../../../infrastructure/agent-runtime/agent-session-directories.js';
import { reportErrorDiagnostic } from '../../../../infrastructure/error-diagnostic.js';
import {
  InspectAgentConfigurationQuery,
  type InspectAgentConfigurationQueryReturnType,
} from '../impl/inspect-agent-configuration.query.js';

@QueryHandler(InspectAgentConfigurationQuery)
export class InspectAgentConfigurationHandler implements IQueryHandler<
  InspectAgentConfigurationQuery,
  InspectAgentConfigurationQueryReturnType
> {
  private readonly logger = new Logger(InspectAgentConfigurationHandler.name);

  constructor(
    @Inject(AGENT_MANAGER) private readonly manager: AgentManager,
    @Inject(AGENT_LAUNCH_CONTEXT) private readonly launchContext: AgentStartContext,
    private readonly directories: AgentSessionDirectories,
  ) {}

  async execute({
    data,
  }: InspectAgentConfigurationQuery): Promise<InspectAgentConfigurationQueryReturnType> {
    try {
      return await this.manager.inspectConfiguration(
        {
          agent: { id: data.agentId, version: data.agentVersion },
          workspace: { directory: this.directories.workspaceDirectory },
        },
        this.launchContext,
      );
    } catch (error) {
      if (error instanceof AgentManagerError) {
        reportErrorDiagnostic(
          this.logger,
          {
            operation: 'agent.configuration.inspect',
            agentId: data.agentId,
            agentVersion: data.agentVersion,
            runtimeCode: error.fault.code,
            phase: error.fault.phase,
            retryable: error.fault.retryable,
          },
          error,
        );
      }

      throw error;
    }
  }
}
