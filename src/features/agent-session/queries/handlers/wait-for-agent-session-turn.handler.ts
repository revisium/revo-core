import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
} from '../../../../infrastructure/agent-runtime/agent-session.errors.js';
import { AgentSessionTurnRegistry } from '../../turns/agent-session-turn-registry.js';
import {
  WaitForAgentSessionTurnQuery,
  type WaitForAgentSessionTurnQueryReturnType,
} from '../impl/wait-for-agent-session-turn.query.js';

@QueryHandler(WaitForAgentSessionTurnQuery)
export class WaitForAgentSessionTurnHandler implements IQueryHandler<
  WaitForAgentSessionTurnQuery,
  WaitForAgentSessionTurnQueryReturnType
> {
  constructor(private readonly turns: AgentSessionTurnRegistry) {}

  async execute({
    data,
  }: WaitForAgentSessionTurnQuery): Promise<WaitForAgentSessionTurnQueryReturnType> {
    const turn = this.turns.get(data.turnId);

    if (turn === undefined) {
      throw new AgentSessionApplicationError(
        AgentSessionErrorCode.notFound,
        'Agent session turn is unknown.',
      );
    }

    return turn.completion;
  }
}
