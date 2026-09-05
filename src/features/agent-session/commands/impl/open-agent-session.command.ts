import { Command } from '@nestjs/cqrs';

import type {
  AgentConfigurationSelectionData,
  AgentSessionOpenedReadModel,
} from '../../contracts/agent-session.contracts.js';

export type OpenAgentSessionCommandData = {
  readonly agentId: string;
  readonly agentVersion: string;
  readonly configuration?: AgentConfigurationSelectionData;
};

export type OpenAgentSessionCommandReturnType = AgentSessionOpenedReadModel;

export class OpenAgentSessionCommand extends Command<OpenAgentSessionCommandReturnType> {
  constructor(readonly data: OpenAgentSessionCommandData) {
    super();
  }
}
