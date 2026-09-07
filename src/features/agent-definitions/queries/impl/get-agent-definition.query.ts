import { Query } from '@nestjs/cqrs';

import type { AgentDefinitionReadModel } from '../../contracts/agent-definitions.contracts.js';

export type GetAgentDefinitionQueryData = {
  readonly agentId: string;
  readonly agentVersion: string;
};

export type GetAgentDefinitionQueryReturnType = AgentDefinitionReadModel | undefined;

export class GetAgentDefinitionQuery extends Query<GetAgentDefinitionQueryReturnType> {
  constructor(readonly data: GetAgentDefinitionQueryData) {
    super();
  }
}
