import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentConfigurationCache } from '../../configurations/agent-configuration-cache.js';
import {
  AgentDefinitionsApplicationError,
  AgentDefinitionsErrorCode,
} from '../../contracts/agent-definitions.errors.js';
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
    private readonly cache: AgentConfigurationCache,
  ) {}

  async execute({
    data,
  }: InspectAgentConfigurationQuery): Promise<InspectAgentConfigurationQueryReturnType> {
    const known = this.manager.sessions
      .listAgents()
      .some(({ agent }) => agent.id === data.agentId && agent.version === data.agentVersion);

    if (!known) {
      throw new AgentDefinitionsApplicationError(
        AgentDefinitionsErrorCode.notFound,
        'Agent definition was not found.',
      );
    }
    const catalog = this.cache
      .snapshot()
      .catalogs.find(
        ({ agent }) => agent.id === data.agentId && agent.version === data.agentVersion,
      );

    if (catalog === undefined) {
      throw new AgentDefinitionsApplicationError(
        AgentDefinitionsErrorCode.unavailable,
        'Agent configuration is unavailable.',
      );
    }

    return catalog;
  }
}
