import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import { paginateAgentSessions } from '../../contracts/agent-session.pagination.js';
import {
  ListTerminalAgentSessionsQuery,
  type ListTerminalAgentSessionsQueryReturnType,
} from '../impl/list-terminal-agent-sessions.query.js';

@QueryHandler(ListTerminalAgentSessionsQuery)
export class ListTerminalAgentSessionsHandler implements IQueryHandler<
  ListTerminalAgentSessionsQuery,
  ListTerminalAgentSessionsQueryReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({
    data,
  }: ListTerminalAgentSessionsQuery): Promise<ListTerminalAgentSessionsQueryReturnType> {
    return paginateAgentSessions(
      this.manager.sessions.listTerminal(),
      data,
      (record) => ({ timestamp: record.finishedAt, sessionId: record.sessionId }),
      'terminal',
    );
  }
}
