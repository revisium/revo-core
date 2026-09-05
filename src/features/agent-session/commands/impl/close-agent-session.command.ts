import { Command } from '@nestjs/cqrs';

import type { AgentSessionCloseReadModel } from '../../contracts/agent-session.contracts.js';

export type CloseAgentSessionCommandData = { readonly sessionId: string };

export type CloseAgentSessionCommandReturnType = AgentSessionCloseReadModel;

export class CloseAgentSessionCommand extends Command<CloseAgentSessionCommandReturnType> {
  constructor(readonly data: CloseAgentSessionCommandData) {
    super();
  }
}
