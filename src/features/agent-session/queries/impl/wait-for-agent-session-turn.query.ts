import { Query } from '@nestjs/cqrs';

import type { AgentSessionTurnResultReadModel } from '../../contracts/agent-session.contracts.js';

export type WaitForAgentSessionTurnQueryData = { readonly turnId: string };

export type WaitForAgentSessionTurnQueryReturnType = AgentSessionTurnResultReadModel;

export class WaitForAgentSessionTurnQuery extends Query<WaitForAgentSessionTurnQueryReturnType> {
  constructor(readonly data: WaitForAgentSessionTurnQueryData) {
    super();
  }
}
