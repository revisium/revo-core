import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { AgentConfigurationCache } from '../../configurations/agent-configuration-cache.js';
import { projectPublicAgentConfigurations } from '../../configurations/public-agent-configurations.js';
import {
  WatchAgentConfigurationsQuery,
  type WatchAgentConfigurationsQueryReturnType,
} from '../impl/watch-agent-configurations.query.js';

@QueryHandler(WatchAgentConfigurationsQuery)
export class WatchAgentConfigurationsHandler implements IQueryHandler<
  WatchAgentConfigurationsQuery,
  WatchAgentConfigurationsQueryReturnType
> {
  constructor(private readonly cache: AgentConfigurationCache) {}

  async execute(): Promise<WatchAgentConfigurationsQueryReturnType> {
    const source = this.cache.watch();
    return (async function* () {
      for await (const snapshot of source) {
        yield projectPublicAgentConfigurations(snapshot);
      }
    })();
  }
}
