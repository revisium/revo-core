import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  GetAgentSessionTurnQuery,
  type GetAgentSessionTurnQueryReturnType,
} from '../impl/get-agent-session-turn.query.js';

@QueryHandler(GetAgentSessionTurnQuery)
export class GetAgentSessionTurnHandler implements IQueryHandler<
  GetAgentSessionTurnQuery,
  GetAgentSessionTurnQueryReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({ data }: GetAgentSessionTurnQuery): Promise<GetAgentSessionTurnQueryReturnType> {
    return this.manager.sessions.inspectTurn(data.sessionId, data.turnId);
  }
}
