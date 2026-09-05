import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { AgentSessionEventJournal } from '../../../../infrastructure/agent-runtime/agent-session-event-journal.js';
import {
  SubscribeAgentSessionEventsQuery,
  type SubscribeAgentSessionEventsQueryReturnType,
} from '../impl/subscribe-agent-session-events.query.js';

@QueryHandler(SubscribeAgentSessionEventsQuery)
export class SubscribeAgentSessionEventsHandler implements IQueryHandler<
  SubscribeAgentSessionEventsQuery,
  SubscribeAgentSessionEventsQueryReturnType
> {
  constructor(private readonly journal: AgentSessionEventJournal) {}

  async execute({
    data,
  }: SubscribeAgentSessionEventsQuery): Promise<SubscribeAgentSessionEventsQueryReturnType> {
    return this.journal.subscribe(data.sessionId, data.after);
  }
}
