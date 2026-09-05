import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  CancelAgentSessionCommand,
  type CancelAgentSessionCommandReturnType,
} from '../impl/cancel-agent-session.command.js';

@CommandHandler(CancelAgentSessionCommand)
export class CancelAgentSessionHandler implements ICommandHandler<
  CancelAgentSessionCommand,
  CancelAgentSessionCommandReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({ data }: CancelAgentSessionCommand): Promise<CancelAgentSessionCommandReturnType> {
    return this.manager.sessions.cancel(data.sessionId, 'revo_core_api_cancel');
  }
}
