import { Query } from '@nestjs/cqrs';

import type { AgentConfigurationsSnapshot } from '../../contracts/agent-configurations.contracts.js';

export type GetAgentConfigurationsQueryReturnType = AgentConfigurationsSnapshot;
export type AgentConfigurationsView = 'connected' | 'all';

export class GetAgentConfigurationsQuery extends Query<GetAgentConfigurationsQueryReturnType> {
  constructor(readonly view: AgentConfigurationsView) {
    super();
  }
}
