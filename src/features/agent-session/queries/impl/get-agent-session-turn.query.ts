import { Query } from '@nestjs/cqrs';

import type { AgentSessionTurnReadModel } from '../../contracts/agent-session.contracts.js';

export type GetAgentSessionTurnQueryData = { readonly sessionId: string; readonly turnId: string };

export type GetAgentSessionTurnQueryReturnType = AgentSessionTurnReadModel | undefined;

export class GetAgentSessionTurnQuery extends Query<GetAgentSessionTurnQueryReturnType> {
  constructor(readonly data: GetAgentSessionTurnQueryData) {
    super();
  }
}
