import { Query } from '@nestjs/cqrs';

import type {
  AgentSessionPageData,
  AgentSessionPage,
  AgentDescriptorReadModel,
} from '../../contracts/agent-session.contracts.js';

export type ListAgentDefinitionsQueryData = AgentSessionPageData;

export type ListAgentDefinitionsQueryReturnType = AgentSessionPage<AgentDescriptorReadModel>;

export class ListAgentDefinitionsQuery extends Query<ListAgentDefinitionsQueryReturnType> {
  constructor(readonly data: ListAgentDefinitionsQueryData) {
    super();
  }
}
