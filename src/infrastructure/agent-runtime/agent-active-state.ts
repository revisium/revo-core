import { Injectable } from '@nestjs/common';
import type {
  ActiveAgentSessionSnapshot,
  ActiveAgentSessionStateSink,
  ActiveInvocationSnapshot,
  ActiveInvocationStateSink,
} from '@revisium/revo-agent-runtime';

@Injectable()
export class AgentActiveState {
  private readonly invocations = new Map<string, ActiveInvocationSnapshot>();
  private readonly sessions = new Map<string, ActiveAgentSessionSnapshot>();

  readonly invocationSink: ActiveInvocationStateSink = {
    save: async (snapshot) => {
      this.invocations.set(snapshot.invocationId, snapshot);
    },
    remove: async (invocationId) => {
      this.invocations.delete(invocationId);
    },
  };

  readonly sessionSink: ActiveAgentSessionStateSink = {
    save: async (snapshot) => {
      this.sessions.set(snapshot.sessionId, snapshot);

      return { state: 'applied' };
    },
    remove: async (identity) => {
      const current = this.sessions.get(identity.sessionId);

      if (current !== undefined && current.incarnationId !== identity.incarnationId) {
        return { state: 'not_owner' };
      }

      this.sessions.delete(identity.sessionId);

      return { state: 'applied' };
    },
  };
}
