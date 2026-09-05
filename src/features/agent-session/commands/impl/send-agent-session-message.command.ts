import { Command } from '@nestjs/cqrs';

import type { AgentSessionTurnResultReadModel } from '../../contracts/agent-session.contracts.js';

export type SendAgentSessionMessageCommandData = {
  readonly sessionId: string;
  readonly prompt: string;
};

export type SendAgentSessionMessageCommandReturnType = AgentSessionTurnResultReadModel;

export class SendAgentSessionMessageCommand extends Command<SendAgentSessionMessageCommandReturnType> {
  constructor(readonly data: SendAgentSessionMessageCommandData) {
    super();
  }
}
