import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  GetTerminalAgentSessionQuery,
  type GetTerminalAgentSessionQueryReturnType,
} from '../impl/get-terminal-agent-session.query.js';

@QueryHandler(GetTerminalAgentSessionQuery)
export class GetTerminalAgentSessionHandler implements IQueryHandler<
  GetTerminalAgentSessionQuery,
  GetTerminalAgentSessionQueryReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({
    data,
  }: GetTerminalAgentSessionQuery): Promise<GetTerminalAgentSessionQueryReturnType> {
    return this.manager.sessions.getTerminal(data.sessionId);
  }
}
