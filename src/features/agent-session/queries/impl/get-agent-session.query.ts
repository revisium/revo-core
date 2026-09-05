import { Query } from '@nestjs/cqrs';

import type { AgentSessionReadModel } from '../../contracts/agent-session.contracts.js';

export type GetAgentSessionQueryData = { readonly sessionId: string };

export type GetAgentSessionQueryReturnType = AgentSessionReadModel | undefined;

export class GetAgentSessionQuery extends Query<GetAgentSessionQueryReturnType> {
  constructor(readonly data: GetAgentSessionQueryData) {
    super();
  }
}
