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
  StartAgentSessionTurnCommand,
  type StartAgentSessionTurnCommandReturnType,
} from '../impl/start-agent-session-turn.command.js';

@CommandHandler(StartAgentSessionTurnCommand)
export class StartAgentSessionTurnHandler implements ICommandHandler<
  StartAgentSessionTurnCommand,
  StartAgentSessionTurnCommandReturnType
> {
  constructor(
    @Inject(AGENT_MANAGER) private readonly manager: AgentManager,
    private readonly turns: AgentSessionTurnRegistry,
  ) {}

  async execute({
    data,
  }: StartAgentSessionTurnCommand): Promise<StartAgentSessionTurnCommandReturnType> {
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

      return { sessionId: tracked.handle.sessionId, turnId: tracked.handle.turnId };
    } finally {
      release();
    }
  }
}
