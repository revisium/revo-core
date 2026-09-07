import type { AgentManager, AgentSession } from '@revisium/revo-agent-runtime';

interface ResponseBarrier {
  readonly reached: () => void;
  readonly release: Promise<void>;
  fail: boolean;
}

export class ControllableDialogueResponseDelivery {
  private barrier: ResponseBarrier | undefined;

  wrap(manager: AgentManager): AgentManager {
    const sessions = {
      ...manager.sessions,
      get: (sessionId: string) => this.session(manager.sessions.get(sessionId)),
    };

    return { ...manager, sessions };
  }

  holdNextResponse(): { readonly reached: Promise<void>; fail(): void; release(): void } {
    if (this.barrier !== undefined) {
      throw new Error('A dialogue response delivery barrier is already active.');
    }

    const reached = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const barrier = { reached: reached.resolve, release: release.promise, fail: false };
    this.barrier = barrier;

    return {
      reached: reached.promise,
      fail: () => {
        barrier.fail = true;
        release.resolve();
      },
      release: release.resolve,
    };
  }

  private session(session: AgentSession | undefined): AgentSession | undefined {
    if (session === undefined) {
      return undefined;
    }

    const originalRespond = session.respond.bind(session);

    return {
      ...session,
      respond: async (request) => {
        const barrier = this.barrier;

        if (barrier === undefined) {
          return originalRespond(request);
        }

        this.barrier = undefined;
        barrier.reached();
        await barrier.release;

        if (barrier.fail) {
          throw new Error('Controlled interaction response delivery failure.');
        }

        return originalRespond(request);
      },
    };
  }
}
