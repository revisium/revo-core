import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  GetAgentSessionQuery,
  type GetAgentSessionQueryReturnType,
} from '../impl/get-agent-session.query.js';

@QueryHandler(GetAgentSessionQuery)
export class GetAgentSessionHandler implements IQueryHandler<
  GetAgentSessionQuery,
  GetAgentSessionQueryReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({ data }: GetAgentSessionQuery): Promise<GetAgentSessionQueryReturnType> {
    return this.manager.sessions.inspect(data.sessionId);
  }
}
