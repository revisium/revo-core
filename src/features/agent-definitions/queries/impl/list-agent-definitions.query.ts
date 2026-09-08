import { Query } from '@nestjs/cqrs';

import type {
  AgentDefinitionPage,
  AgentDefinitionPageData,
  AgentDefinitionReadModel,
} from '../../contracts/agent-definitions.contracts.js';

export type ListAgentDefinitionsQueryData = AgentDefinitionPageData;

export type ListAgentDefinitionsQueryReturnType = AgentDefinitionPage<AgentDefinitionReadModel>;

export class ListAgentDefinitionsQuery extends Query<ListAgentDefinitionsQueryReturnType> {
  constructor(readonly data: ListAgentDefinitionsQueryData) {
    super();
  }
}
