import { Command } from '@nestjs/cqrs';

import type { AgentSessionTurnStartedReadModel } from '../../contracts/agent-session.contracts.js';

export type StartAgentSessionTurnCommandData = {
  readonly sessionId: string;
  readonly prompt: string;
};

export type StartAgentSessionTurnCommandReturnType = AgentSessionTurnStartedReadModel;

export class StartAgentSessionTurnCommand extends Command<StartAgentSessionTurnCommandReturnType> {
  constructor(readonly data: StartAgentSessionTurnCommandData) {
    super();
  }
}
