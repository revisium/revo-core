import { randomUUID } from 'node:crypto';

import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
} from '../../../../infrastructure/agent-runtime/agent-session.errors.js';
import { AgentSessionTurnRegistry } from '../../turns/agent-session-turn-registry.js';
import {
  SendAgentSessionMessageCommand,
  type SendAgentSessionMessageCommandReturnType,
} from '../impl/send-agent-session-message.command.js';

@CommandHandler(SendAgentSessionMessageCommand)
export class SendAgentSessionMessageHandler implements ICommandHandler<
  SendAgentSessionMessageCommand,
  SendAgentSessionMessageCommandReturnType
> {
  constructor(
    @Inject(AGENT_MANAGER) private readonly manager: AgentManager,
    private readonly turns: AgentSessionTurnRegistry,
  ) {}

  async execute({
    data,
  }: SendAgentSessionMessageCommand): Promise<SendAgentSessionMessageCommandReturnType> {
    const session = this.manager.sessions.get(data.sessionId);

    if (session === undefined) {
      throw new AgentSessionApplicationError(
        AgentSessionErrorCode.notFound,
        'Agent session is not active.',
      );
    }

    const release = this.turns.reserve();

    try {
      const handle = await session.send({
        turnId: 'trn_' + randomUUID().replaceAll('-', ''),
        prompt: data.prompt,
      });
      const tracked = this.turns.add(handle);

      return tracked.completion;
    } finally {
      release();
    }
  }
}
