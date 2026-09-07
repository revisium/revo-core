import type { AgentSessionEventSink } from '@revisium/revo-agent-runtime';

import { DialogueEventIngestionApiService } from '../../../src/features/dialogues/ingestion/dialogue-event-ingestion-api.service.js';
import { appendAgentSessionEvent } from '../../../src/infrastructure/agent-runtime/agent-session-event-journal.js';
import { DialogueEventReader } from '../../../src/infrastructure/dialogue/dialogue-event-reader.js';
import { FakeAgentControl } from './fake-agent-control.js';

export class ObservedAgentSessionEventJournal {
  constructor(
    private readonly ingestion: DialogueEventIngestionApiService,
    private readonly reader: DialogueEventReader,
    private readonly control: FakeAgentControl,
  ) {}

  readonly sink: AgentSessionEventSink = {
    append: async (event, context) => {
      const correlated = event.type === 'session.accepted' && event.sessionId.startsWith('dlg_');
      if (correlated) {
        await this.control.reserveRuntimeSession(event.sessionId);
      }
      try {
        const result = await appendAgentSessionEvent(this.ingestion, event, context);
        if (correlated && result.state !== 'appended') {
          this.control.releaseRuntimeSession(event.sessionId);
        }
        return result;
      } catch (error) {
        if (correlated) {
          this.control.releaseRuntimeSession(event.sessionId);
        }
        throw error;
      }
    },
  };

  subscribe(sessionId: string, after?: Parameters<DialogueEventReader['events']>[1]) {
    return this.reader.events(sessionId, after);
  }
}
