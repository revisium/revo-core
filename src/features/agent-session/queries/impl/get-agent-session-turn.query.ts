import { Query } from '@nestjs/cqrs';

import type { AgentSessionTrackedTurnReadModel } from '../../contracts/agent-session.contracts.js';

export type GetAgentSessionTurnQueryData = { readonly turnId: string };

export type GetAgentSessionTurnQueryReturnType = AgentSessionTrackedTurnReadModel | undefined;

export class GetAgentSessionTurnQuery extends Query<GetAgentSessionTurnQueryReturnType> {
  constructor(readonly data: GetAgentSessionTurnQueryData) {
    super();
  }
}
