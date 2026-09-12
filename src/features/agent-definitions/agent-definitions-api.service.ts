import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import type { AgentDefinitionPageData } from './contracts/agent-definitions.contracts.js';
import {
  GetAgentDefinitionQuery,
  ListAgentDefinitionsQuery,
} from './queries/agent-definition.queries.js';
import { GetAgentConfigurationsQuery } from './queries/impl/get-agent-configurations.query.js';
import { WatchAgentConfigurationsQuery } from './queries/impl/watch-agent-configurations.query.js';

@Injectable()
export class AgentDefinitionsApiService {
  constructor(private readonly queries: QueryBus) {}

  configurations() {
    return this.queries.execute(new GetAgentConfigurationsQuery());
  }

  watchConfigurations() {
    return this.queries.execute(new WatchAgentConfigurationsQuery());
  }

  list(data: AgentDefinitionPageData = {}) {
    return this.queries.execute(new ListAgentDefinitionsQuery(data));
  }

  get(agentId: string, agentVersion: string) {
    return this.queries.execute(new GetAgentDefinitionQuery({ agentId, agentVersion }));
  }
}
