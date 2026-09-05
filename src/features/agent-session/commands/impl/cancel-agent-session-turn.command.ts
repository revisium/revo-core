import { Command } from '@nestjs/cqrs';

import type { AgentSessionCancelTurnReadModel } from '../../contracts/agent-session.contracts.js';

export type CancelAgentSessionTurnCommandData = { readonly turnId: string };

export type CancelAgentSessionTurnCommandReturnType = AgentSessionCancelTurnReadModel;

export class CancelAgentSessionTurnCommand extends Command<CancelAgentSessionTurnCommandReturnType> {
  constructor(readonly data: CancelAgentSessionTurnCommandData) {
    super();
  }
}
