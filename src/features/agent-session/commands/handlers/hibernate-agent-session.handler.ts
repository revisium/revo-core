import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
} from '../../../../infrastructure/agent-runtime/agent-session.errors.js';
import {
  HibernateAgentSessionCommand,
  type HibernateAgentSessionCommandReturnType,
} from '../impl/hibernate-agent-session.command.js';

@CommandHandler(HibernateAgentSessionCommand)
export class HibernateAgentSessionHandler implements ICommandHandler<
  HibernateAgentSessionCommand,
  HibernateAgentSessionCommandReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({
    data,
  }: HibernateAgentSessionCommand): Promise<HibernateAgentSessionCommandReturnType> {
    const session = this.manager.sessions.get(data.sessionId);

    if (session === undefined) {
      throw new AgentSessionApplicationError(
        AgentSessionErrorCode.notFound,
        'Agent session is not active.',
      );
    }

    return session.hibernate('revo_core_api_hibernate');
  }
}
