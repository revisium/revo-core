import { Query } from '@nestjs/cqrs';

import type { AgentConfigurationsSnapshot } from '../../contracts/agent-configurations.contracts.js';

export type WatchAgentConfigurationsQueryReturnType = AsyncIterable<AgentConfigurationsSnapshot>;

export class WatchAgentConfigurationsQuery extends Query<WatchAgentConfigurationsQueryReturnType> {
  constructor(readonly connectedOnly = true) {
    super();
  }
}
