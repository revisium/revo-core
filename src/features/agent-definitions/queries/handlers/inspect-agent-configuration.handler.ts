import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { AgentManager, AgentStartContext } from '@revisium/revo-agent-runtime';

import {
  AGENT_MANAGER,
  AGENT_LAUNCH_CONTEXT,
} from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../../../infrastructure/agent-runtime/agent-session-directories.js';
import {
  InspectAgentConfigurationQuery,
  type InspectAgentConfigurationQueryReturnType,
} from '../impl/inspect-agent-configuration.query.js';

@QueryHandler(InspectAgentConfigurationQuery)
export class InspectAgentConfigurationHandler implements IQueryHandler<
  InspectAgentConfigurationQuery,
  InspectAgentConfigurationQueryReturnType
> {
  constructor(
    @Inject(AGENT_MANAGER) private readonly manager: AgentManager,
    @Inject(AGENT_LAUNCH_CONTEXT) private readonly launchContext: AgentStartContext,
    private readonly directories: AgentSessionDirectories,
  ) {}

  async execute({
    data,
  }: InspectAgentConfigurationQuery): Promise<InspectAgentConfigurationQueryReturnType> {
    return this.manager.inspectConfiguration(
      {
        agent: { id: data.agentId, version: data.agentVersion },
        workspace: { directory: this.directories.workspaceDirectory },
      },
      this.launchContext,
    );
  }
}
