import type { AgentSessionEventSink } from '@revisium/revo-agent-runtime';

import { DialogueEventIngestionApiService } from '../../../src/features/dialogue-event-ingestion/dialogue-event-ingestion-api.service.js';
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
        const result = await this.ingestion.append(event, context.expected, context.signal);
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
