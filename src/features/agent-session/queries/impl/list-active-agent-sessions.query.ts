import { Query } from '@nestjs/cqrs';

import type {
  AgentSessionPageData,
  AgentSessionPage,
  AgentSessionReadModel,
} from '../../contracts/agent-session.contracts.js';

export type ListActiveAgentSessionsQueryData = AgentSessionPageData;

export type ListActiveAgentSessionsQueryReturnType = AgentSessionPage<AgentSessionReadModel>;

export class ListActiveAgentSessionsQuery extends Query<ListActiveAgentSessionsQueryReturnType> {
  constructor(readonly data: ListActiveAgentSessionsQueryData) {
    super();
  }
}
