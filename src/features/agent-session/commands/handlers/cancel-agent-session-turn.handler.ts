import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
} from '../../../../infrastructure/agent-runtime/agent-session.errors.js';
import {
  CancelAgentSessionTurnCommand,
  type CancelAgentSessionTurnCommandReturnType,
} from '../impl/cancel-agent-session-turn.command.js';

@CommandHandler(CancelAgentSessionTurnCommand)
export class CancelAgentSessionTurnHandler implements ICommandHandler<
  CancelAgentSessionTurnCommand,
  CancelAgentSessionTurnCommandReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({
    data,
  }: CancelAgentSessionTurnCommand): Promise<CancelAgentSessionTurnCommandReturnType> {
    const turn = this.manager.sessions.getTurn(data.sessionId, data.turnId);

    if (turn === undefined) {
      throw new AgentSessionApplicationError(
        AgentSessionErrorCode.notFound,
        'Agent session turn is unknown.',
      );
    }

    return turn.cancel('revo_core_api_cancel_turn');
  }
}
