import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import type { AgentDefinitionPageData } from './contracts/agent-definitions.contracts.js';
import {
  GetAgentDefinitionQuery,
  InspectAgentConfigurationQuery,
  ListAgentDefinitionsQuery,
} from './queries/agent-definition.queries.js';

@Injectable()
export class AgentDefinitionsApiService {
  constructor(private readonly queries: QueryBus) {}

  list(data: AgentDefinitionPageData = {}) {
    return this.queries.execute(new ListAgentDefinitionsQuery(data));
  }

  get(agentId: string, agentVersion: string) {
    return this.queries.execute(new GetAgentDefinitionQuery({ agentId, agentVersion }));
  }

  inspectConfiguration(agentId: string, agentVersion: string) {
    return this.queries.execute(new InspectAgentConfigurationQuery({ agentId, agentVersion }));
  }
}
