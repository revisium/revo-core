import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
} from '../../../../infrastructure/agent-runtime/agent-session.errors.js';
import { AgentSessionTurnRegistry } from '../../turns/agent-session-turn-registry.js';
import {
  CancelAgentSessionTurnCommand,
  type CancelAgentSessionTurnCommandReturnType,
} from '../impl/cancel-agent-session-turn.command.js';

@CommandHandler(CancelAgentSessionTurnCommand)
export class CancelAgentSessionTurnHandler implements ICommandHandler<
  CancelAgentSessionTurnCommand,
  CancelAgentSessionTurnCommandReturnType
> {
  constructor(private readonly turns: AgentSessionTurnRegistry) {}

  async execute({
    data,
  }: CancelAgentSessionTurnCommand): Promise<CancelAgentSessionTurnCommandReturnType> {
    const turn = this.turns.get(data.turnId);

    if (turn === undefined) {
      throw new AgentSessionApplicationError(
        AgentSessionErrorCode.notFound,
        'Agent session turn is unknown.',
      );
    }

    return turn.handle.cancel('revo_core_api_cancel_turn');
  }
}
