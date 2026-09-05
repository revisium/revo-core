import { Query } from '@nestjs/cqrs';

import type {
  AgentSessionPageData,
  AgentSessionPage,
  AgentSessionTerminalReadModel,
} from '../../contracts/agent-session.contracts.js';

export type ListTerminalAgentSessionsQueryData = AgentSessionPageData;

export type ListTerminalAgentSessionsQueryReturnType =
  AgentSessionPage<AgentSessionTerminalReadModel>;

export class ListTerminalAgentSessionsQuery extends Query<ListTerminalAgentSessionsQueryReturnType> {
  constructor(readonly data: ListTerminalAgentSessionsQueryData) {
    super();
  }
}
