import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  RespondAgentSessionCommand,
  type RespondAgentSessionCommandReturnType,
} from '../impl/respond-agent-session.command.js';

@CommandHandler(RespondAgentSessionCommand)
export class RespondAgentSessionHandler implements ICommandHandler<
  RespondAgentSessionCommand,
  RespondAgentSessionCommandReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({
    data,
  }: RespondAgentSessionCommand): Promise<RespondAgentSessionCommandReturnType> {
    const { requestId, ...response } = data.response;

    return this.manager.sessions.respond(data.sessionId, { requestId, response });
  }
}
