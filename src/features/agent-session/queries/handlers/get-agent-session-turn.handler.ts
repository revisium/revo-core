import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { AgentSessionTurnRegistry } from '../../turns/agent-session-turn-registry.js';
import {
  GetAgentSessionTurnQuery,
  type GetAgentSessionTurnQueryReturnType,
} from '../impl/get-agent-session-turn.query.js';

@QueryHandler(GetAgentSessionTurnQuery)
export class GetAgentSessionTurnHandler implements IQueryHandler<
  GetAgentSessionTurnQuery,
  GetAgentSessionTurnQueryReturnType
> {
  constructor(private readonly turns: AgentSessionTurnRegistry) {}

  async execute({ data }: GetAgentSessionTurnQuery): Promise<GetAgentSessionTurnQueryReturnType> {
    const turn = this.turns.get(data.turnId);

    if (turn === undefined) {
      return undefined;
    }

    if (turn.failure !== undefined) {
      throw turn.failure;
    }

    return {
      sessionId: turn.handle.sessionId,
      turnId: turn.handle.turnId,
      state: turn.state,
      ...(turn.result === undefined ? {} : { result: turn.result }),
    };
  }
}
