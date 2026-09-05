import { Query } from '@nestjs/cqrs';

import type { AgentDescriptorReadModel } from '../../contracts/agent-session.contracts.js';

export type GetAgentDefinitionQueryData = {
  readonly agentId: string;
  readonly agentVersion: string;
};

export type GetAgentDefinitionQueryReturnType = AgentDescriptorReadModel | undefined;

export class GetAgentDefinitionQuery extends Query<GetAgentDefinitionQueryReturnType> {
  constructor(readonly data: GetAgentDefinitionQueryData) {
    super();
  }
}
