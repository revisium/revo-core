import { Injectable } from '@nestjs/common';
import type {
  AgentSessionEvent,
  AgentSessionEventAppendResult,
  AgentSessionEventCursor,
  AgentSessionEventSink,
} from '@revisium/revo-agent-runtime';

import { DialogueEventIngestionApiService } from '../../features/dialogues/ingestion/dialogue-event-ingestion-api.service.js';
import { DialogueEventReader } from '../dialogue/dialogue-event-reader.js';

export const appendAgentSessionEvent = (
  ingestion: DialogueEventIngestionApiService,
  event: AgentSessionEvent,
  context: Parameters<AgentSessionEventSink['append']>[1],
): Promise<AgentSessionEventAppendResult> => {
  switch (event.type) {
    case 'assistant.message.delta':
      return ingestion.appendTextDelta(event, context.expected, context.signal);
    case 'assistant.message.completed':
      return ingestion.completeAssistantMessage(event, context.expected, context.signal);
    case 'turn.started':
      return ingestion.startTurn(event, context.expected, context.signal);
    case 'turn.completed':
      return ingestion.completeTurn(event, context.expected, context.signal);
    case 'agent.progress':
      return ingestion.updateProgress(event, context.expected, context.signal);
    case 'tool.activity':
    case 'plan.updated':
    case 'usage.updated':
      return ingestion.recordActivity(event, context.expected, context.signal);
    case 'interaction.requested':
      return ingestion.requestInteraction(event, context.expected, context.signal);
    case 'interaction.resolved':
      return ingestion.resolveInteraction(event, context.expected, context.signal);
    case 'session.closed':
      return ingestion.closeSession(event, context.expected, context.signal);
    case 'session.accepted':
    case 'session.opened':
    case 'session.checkpointed':
    case 'session.hibernated':
      return ingestion.recordLifecycleEvent(event, context.expected, context.signal);
  }

  throw new Error('Unsupported agent session event.');
};

@Injectable()
export class AgentSessionEventJournal {
  constructor(
    private readonly ingestion: DialogueEventIngestionApiService,
    private readonly reader: DialogueEventReader,
  ) {}

  readonly sink: AgentSessionEventSink = {
    append: (event, context) => appendAgentSessionEvent(this.ingestion, event, context),
  };

  subscribe(sessionId: string, after?: AgentSessionEventCursor) {
    return this.reader.events(sessionId, after);
  }
}
