import { Command } from '@nestjs/cqrs';

import type {
  AgentSessionResumeTokenData,
  AgentConfigurationSelectionData,
  AgentSessionOpenedReadModel,
} from '../../contracts/agent-session.contracts.js';

export type ResumeAgentSessionCommandData = {
  readonly token: AgentSessionResumeTokenData;
  readonly configuration?: AgentConfigurationSelectionData;
};

export type ResumeAgentSessionCommandReturnType = AgentSessionOpenedReadModel;

export class ResumeAgentSessionCommand extends Command<ResumeAgentSessionCommandReturnType> {
  constructor(readonly data: ResumeAgentSessionCommandData) {
    super();
  }
}
