import { Command } from '@nestjs/cqrs';

import type { AgentSessionCancelReadModel } from '../../contracts/agent-session.contracts.js';

export type CancelAgentSessionCommandData = { readonly sessionId: string };

export type CancelAgentSessionCommandReturnType = AgentSessionCancelReadModel;

export class CancelAgentSessionCommand extends Command<CancelAgentSessionCommandReturnType> {
  constructor(readonly data: CancelAgentSessionCommandData) {
    super();
  }
}
