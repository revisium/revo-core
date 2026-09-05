import { Command } from '@nestjs/cqrs';

import type { AgentSessionCheckpointReadModel } from '../../contracts/agent-session.contracts.js';

export type CheckpointAgentSessionCommandData = { readonly sessionId: string };

export type CheckpointAgentSessionCommandReturnType = AgentSessionCheckpointReadModel;

export class CheckpointAgentSessionCommand extends Command<CheckpointAgentSessionCommandReturnType> {
  constructor(readonly data: CheckpointAgentSessionCommandData) {
    super();
  }
}
