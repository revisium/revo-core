import { Injectable } from '@nestjs/common';
import type { AgentSessionEventCursor, AgentSessionEventSink } from '@revisium/revo-agent-runtime';

import { DialogueEventIngestionApiService } from '../../features/dialogue-event-ingestion/dialogue-event-ingestion-api.service.js';
import { DialogueEventReader } from '../dialogue/dialogue-event-reader.js';

@Injectable()
export class AgentSessionEventJournal {
  constructor(
    private readonly ingestion: DialogueEventIngestionApiService,
    private readonly reader: DialogueEventReader,
  ) {}
  readonly sink: AgentSessionEventSink = {
    append: (event, context) => this.ingestion.append(event, context.expected, context.signal),
  };
  subscribe(sessionId: string, after?: AgentSessionEventCursor) {
    return this.reader.events(sessionId, after);
  }
}
