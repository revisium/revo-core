import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import { paginateAgentSessions } from '../../contracts/agent-session.pagination.js';
import {
  ListActiveAgentSessionsQuery,
  type ListActiveAgentSessionsQueryReturnType,
} from '../impl/list-active-agent-sessions.query.js';

@QueryHandler(ListActiveAgentSessionsQuery)
export class ListActiveAgentSessionsHandler implements IQueryHandler<
  ListActiveAgentSessionsQuery,
  ListActiveAgentSessionsQueryReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({
    data,
  }: ListActiveAgentSessionsQuery): Promise<ListActiveAgentSessionsQueryReturnType> {
    return paginateAgentSessions(this.manager.sessions.list(), data, (record) => ({
      timestamp: record.acceptedAt,
      sessionId: record.sessionId,
    }));
  }
}
