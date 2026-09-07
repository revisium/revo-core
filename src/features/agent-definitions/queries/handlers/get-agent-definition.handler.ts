import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  GetAgentDefinitionQuery,
  type GetAgentDefinitionQueryReturnType,
} from '../impl/get-agent-definition.query.js';

@QueryHandler(GetAgentDefinitionQuery)
export class GetAgentDefinitionHandler implements IQueryHandler<
  GetAgentDefinitionQuery,
  GetAgentDefinitionQueryReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({ data }: GetAgentDefinitionQuery): Promise<GetAgentDefinitionQueryReturnType> {
    return this.manager.sessions
      .listAgents()
      .find(({ agent }) => agent.id === data.agentId && agent.version === data.agentVersion);
  }
}
