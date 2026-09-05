import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
} from '../../../../infrastructure/agent-runtime/agent-session.errors.js';
import {
  CloseAgentSessionCommand,
  type CloseAgentSessionCommandReturnType,
} from '../impl/close-agent-session.command.js';

@CommandHandler(CloseAgentSessionCommand)
export class CloseAgentSessionHandler implements ICommandHandler<
  CloseAgentSessionCommand,
  CloseAgentSessionCommandReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({ data }: CloseAgentSessionCommand): Promise<CloseAgentSessionCommandReturnType> {
    const session = this.manager.sessions.get(data.sessionId);

    if (session === undefined) {
      throw new AgentSessionApplicationError(
        AgentSessionErrorCode.notFound,
        'Agent session is not active.',
      );
    }

    return session.close('revo_core_api_close');
  }
}
