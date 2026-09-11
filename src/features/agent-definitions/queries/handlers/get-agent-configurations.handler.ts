import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { AgentConfigurationCache } from '../../configurations/agent-configuration-cache.js';
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

  async execute(): Promise<GetAgentConfigurationsQueryReturnType> {
    return this.cache.snapshot();
  }
}
