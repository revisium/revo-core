import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
} from '../../../../infrastructure/agent-runtime/agent-session.errors.js';
import {
  WaitForAgentSessionTurnQuery,
  type WaitForAgentSessionTurnQueryReturnType,
} from '../impl/wait-for-agent-session-turn.query.js';

@QueryHandler(WaitForAgentSessionTurnQuery)
export class WaitForAgentSessionTurnHandler implements IQueryHandler<
  WaitForAgentSessionTurnQuery,
  WaitForAgentSessionTurnQueryReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({
    data,
  }: WaitForAgentSessionTurnQuery): Promise<WaitForAgentSessionTurnQueryReturnType> {
    const turn = this.manager.sessions.getTurn(data.sessionId, data.turnId);

    if (turn === undefined) {
      throw new AgentSessionApplicationError(
        AgentSessionErrorCode.notFound,
        'Agent session turn is unknown.',
      );
    }

    return turn.result();
  }
}
