import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
} from '../../../../infrastructure/agent-runtime/agent-session.errors.js';
import {
  CheckpointAgentSessionCommand,
  type CheckpointAgentSessionCommandReturnType,
} from '../impl/checkpoint-agent-session.command.js';

@CommandHandler(CheckpointAgentSessionCommand)
export class CheckpointAgentSessionHandler implements ICommandHandler<
  CheckpointAgentSessionCommand,
  CheckpointAgentSessionCommandReturnType
> {
  constructor(@Inject(AGENT_MANAGER) private readonly manager: AgentManager) {}

  async execute({
    data,
  }: CheckpointAgentSessionCommand): Promise<CheckpointAgentSessionCommandReturnType> {
    const session = this.manager.sessions.get(data.sessionId);

    if (session === undefined) {
      throw new AgentSessionApplicationError(
        AgentSessionErrorCode.notFound,
        'Agent session is not active.',
      );
    }

    return session.checkpoint();
  }
}
