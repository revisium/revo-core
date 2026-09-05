import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import { paginateAgentSessions } from '../../contracts/agent-session.pagination.js';
import {
  ListAgentDefinitionsQuery,
  type ListAgentDefinitionsQueryReturnType,
} from '../impl/list-agent-definitions.query.js';

@QueryHandler(ListAgentDefinitionsQuery)
export class ListAgentDefinitionsHandler implements IQueryHandler<
  ListAgentDefinitionsQuery,
  ListAgentDefinitionsQueryReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({ data }: ListAgentDefinitionsQuery): Promise<ListAgentDefinitionsQueryReturnType> {
    return paginateAgentSessions(
      this.manager.sessions.listAgents(),
      data,
      (record) => ({
        timestamp: '',
        sessionId: JSON.stringify([record.agent.id, record.agent.version]),
      }),
      'agents',
    );
  }
}
