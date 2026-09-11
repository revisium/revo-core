import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { AgentConfigurationCache } from '../../configurations/agent-configuration-cache.js';
import { connectedConfigurations } from '../../configurations/agent-configuration-projection.js';
import {
  GetAgentConfigurationsQuery,
  type GetAgentConfigurationsQueryReturnType,
} from '../impl/get-agent-configurations.query.js';

@QueryHandler(GetAgentConfigurationsQuery)
export class GetAgentConfigurationsHandler implements IQueryHandler<
  GetAgentConfigurationsQuery,
  GetAgentConfigurationsQueryReturnType
> {
  constructor(private readonly cache: AgentConfigurationCache) {}

  async execute({
    connectedOnly,
  }: GetAgentConfigurationsQuery): Promise<GetAgentConfigurationsQueryReturnType> {
    const snapshot = this.cache.snapshot();
    return connectedOnly
      ? { ...snapshot, catalogs: connectedConfigurations(snapshot.catalogs) }
      : snapshot;
  }
}
