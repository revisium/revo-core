import { Command } from '@nestjs/cqrs';

import type {
  RespondAgentSessionData,
  AgentSessionRespondReadModel,
} from '../../contracts/agent-session.contracts.js';

export type RespondAgentSessionCommandData = {
  readonly sessionId: string;
  readonly response: RespondAgentSessionData;
};

export type RespondAgentSessionCommandReturnType = AgentSessionRespondReadModel;

export class RespondAgentSessionCommand extends Command<RespondAgentSessionCommandReturnType> {
  constructor(readonly data: RespondAgentSessionCommandData) {
    super();
  }
}
