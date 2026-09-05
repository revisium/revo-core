import { Query } from '@nestjs/cqrs';

import type { AgentConfigurationReadModel } from '../../contracts/agent-session.contracts.js';

export type InspectAgentConfigurationQueryData = {
  readonly agentId: string;
  readonly agentVersion: string;
};

export type InspectAgentConfigurationQueryReturnType = AgentConfigurationReadModel;

export class InspectAgentConfigurationQuery extends Query<InspectAgentConfigurationQueryReturnType> {
  constructor(readonly data: InspectAgentConfigurationQueryData) {
    super();
  }
}
