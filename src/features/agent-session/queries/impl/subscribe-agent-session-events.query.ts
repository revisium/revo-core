import { Query } from '@nestjs/cqrs';

import type {
  AgentSessionEventCursorData,
  AgentSessionEventReadModel,
} from '../../contracts/agent-session.contracts.js';

export type SubscribeAgentSessionEventsQueryData = {
  readonly sessionId: string;
  readonly after?: AgentSessionEventCursorData;
};

export type SubscribeAgentSessionEventsQueryReturnType = AsyncIterable<AgentSessionEventReadModel>;

export class SubscribeAgentSessionEventsQuery extends Query<SubscribeAgentSessionEventsQueryReturnType> {
  constructor(readonly data: SubscribeAgentSessionEventsQueryData) {
    super();
  }
}
