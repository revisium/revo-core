import { Query } from '@nestjs/cqrs';

import type { AgentSessionTerminalReadModel } from '../../contracts/agent-session.contracts.js';

export type GetTerminalAgentSessionQueryData = { readonly sessionId: string };

export type GetTerminalAgentSessionQueryReturnType = AgentSessionTerminalReadModel | undefined;

export class GetTerminalAgentSessionQuery extends Query<GetTerminalAgentSessionQueryReturnType> {
  constructor(readonly data: GetTerminalAgentSessionQueryData) {
    super();
  }
}
