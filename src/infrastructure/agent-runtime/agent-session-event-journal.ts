import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventCursor,
  AgentSessionEventSink,
} from '@revisium/revo-agent-runtime';

import { AgentSessionApplicationError, AgentSessionErrorCode } from './agent-session.errors.js';

interface EventSubscriber {
  readonly queue: AgentSessionEvent[];
  waiting: ((result: IteratorResult<AgentSessionEvent>) => void) | undefined;
  closed: boolean;
  nextPending: boolean;
  failure?: Error;
  bufferedBytes: number;
}

const cursorOf = (event: AgentSessionEvent): AgentSessionEventCursor => ({
  streamId: event.streamId,
  sequence: event.sequence,
  eventId: event.eventId,
});

const sameCursor = (
  left: AgentSessionEventCursor | undefined,
  right: AgentSessionEventCursor,
): boolean =>
  left?.streamId === right.streamId &&
  left.sequence === right.sequence &&
  left.eventId === right.eventId;

const accepts = (
  expected: AgentSessionEventAppendPrecondition,
  last: AgentSessionEventCursor | undefined,
): boolean => {
  if (expected.kind === 'empty') {
    return last === undefined;
  }

  return sameCursor(last, expected.cursor);
};

export class AgentSessionEventJournal {
  private static readonly maxEventsPerSession = 10_000;
  private static readonly maxBytesPerSession = 16 * 1024 * 1024;
  private static readonly maxResumeClaims = 10_000;
  private static readonly maxSubscribersPerSession = 16;
  private static readonly maxTerminalJournals = 100;
  private readonly events = new Map<string, AgentSessionEvent[]>();
  private readonly eventBytes = new Map<string, number>();
  private readonly subscribers = new Map<string, Set<EventSubscriber>>();
  private readonly terminalSessions = new Set<string>();
  private readonly claimedResumeTokens = new Set<string>();
  private readonly terminalOrder: string[] = [];

  readonly sink: AgentSessionEventSink = {
    append: async (event, context) => {
      const stored = this.events.get(event.sessionId) ?? [];
      const last = stored.at(-1);
      const actual = last === undefined ? undefined : cursorOf(last);

      if (!accepts(context.expected, actual)) {
        return { state: 'conflict' as const, ...(actual === undefined ? {} : { actual }) };
      }
      const eventBytes = Buffer.byteLength(JSON.stringify(event));

      if (eventBytes > AgentSessionEventJournal.maxBytesPerSession) {
        throw new AgentSessionApplicationError(
          AgentSessionErrorCode.unavailable,
          'Agent session event exceeds journal capacity.',
        );
      }

      if (context.expected.kind === 'hibernation_token') {
        const claim = context.expected.resumeTokenId;

        if (
          this.claimedResumeTokens.has(claim) ||
          this.claimedResumeTokens.size >= AgentSessionEventJournal.maxResumeClaims
        ) {
          return { state: 'conflict' as const, ...(actual === undefined ? {} : { actual }) };
        }
        this.claimedResumeTokens.add(claim);
      }

      stored.push(event);
      let bytes = (this.eventBytes.get(event.sessionId) ?? 0) + eventBytes;

      while (
        bytes > AgentSessionEventJournal.maxBytesPerSession ||
        stored.length > AgentSessionEventJournal.maxEventsPerSession
      ) {
        const removed = stored.shift();
        bytes -= Buffer.byteLength(JSON.stringify(removed));
      }
      this.eventBytes.set(event.sessionId, bytes);
      this.events.set(event.sessionId, stored);

      if (event.type === 'session.accepted' && event.resumed) {
        this.terminalSessions.delete(event.sessionId);
        this.removeTerminalOrder(event.sessionId);
      }
      const terminal = event.type === 'session.closed' || event.type === 'session.hibernated';

      if (terminal) {
        this.terminalSessions.add(event.sessionId);
        this.removeTerminalOrder(event.sessionId);
        this.terminalOrder.push(event.sessionId);
      }

      for (const subscriber of this.subscribers.get(event.sessionId) ?? []) {
        if (subscriber.closed) {
          continue;
        }

        if (subscriber.waiting === undefined) {
          if (
            subscriber.queue.length >= AgentSessionEventJournal.maxEventsPerSession ||
            subscriber.bufferedBytes + eventBytes > AgentSessionEventJournal.maxBytesPerSession
          ) {
            subscriber.failure = new AgentSessionApplicationError(
              AgentSessionErrorCode.expiredCursor,
              'Subscriber fell behind retained events; reconnect using its last cursor.',
            );
            subscriber.closed = true;
            subscriber.queue.length = 0;
            this.subscribers.get(event.sessionId)?.delete(subscriber);
            continue;
          }
          subscriber.queue.push(event);
          subscriber.bufferedBytes += eventBytes;

          if (terminal) {
            subscriber.closed = true;
          }
          continue;
        }
        const resolve = subscriber.waiting;
        subscriber.waiting = undefined;
        resolve({ done: false, value: event });

        if (terminal) {
          subscriber.closed = true;
        }
      }

      if (terminal) {
        this.subscribers.delete(event.sessionId);
        this.pruneTerminalJournals();
      }

      return { state: 'appended' as const };
    },
  };

  subscribe(sessionId: string, after?: AgentSessionEventCursor): AsyncIterable<AgentSessionEvent> {
    if (!this.events.has(sessionId)) {
      throw new AgentSessionApplicationError(
        AgentSessionErrorCode.notFound,
        'Agent session event stream is not retained.',
      );
    }
    const stored = this.events.get(sessionId) ?? [];
    const start =
      after === undefined ? 0 : stored.findIndex((event) => sameCursor(after, cursorOf(event))) + 1;

    if (after !== undefined && start === 0) {
      const first = stored[0];
      const expired =
        first !== undefined && after.streamId === first.streamId && after.sequence < first.sequence;
      throw new AgentSessionApplicationError(
        expired ? AgentSessionErrorCode.expiredCursor : AgentSessionErrorCode.invalidCursor,
        expired
          ? 'Agent session event cursor has expired.'
          : 'Agent session event cursor is invalid.',
      );
    }
    const subscriber: EventSubscriber = {
      queue: stored.slice(start),
      closed: this.terminalSessions.has(sessionId),
      nextPending: false,
      waiting: undefined,
      bufferedBytes: stored
        .slice(start)
        .reduce((total, entry) => total + Buffer.byteLength(JSON.stringify(entry)), 0),
    };
    const subscribers = this.subscribers.get(sessionId) ?? new Set<EventSubscriber>();

    if (subscribers.size >= AgentSessionEventJournal.maxSubscribersPerSession) {
      throw new AgentSessionApplicationError(
        AgentSessionErrorCode.unavailable,
        'Agent session subscriber capacity reached.',
      );
    }

    if (!subscriber.closed) {
      subscribers.add(subscriber);
      this.subscribers.set(sessionId, subscribers);
    }

    return {
      [Symbol.asyncIterator]: () => ({
        next: () => {
          if (subscriber.failure !== undefined) {
            return Promise.reject(subscriber.failure);
          }

          if (subscriber.nextPending) {
            return Promise.reject(
              new Error('Only one outstanding next() call is allowed per event subscription.'),
            );
          }
          const event = subscriber.queue.shift();

          if (event !== undefined) {
            subscriber.bufferedBytes -= Buffer.byteLength(JSON.stringify(event));

            return Promise.resolve({ done: false as const, value: event });
          }

          if (subscriber.closed) {
            return Promise.resolve({ done: true as const, value: undefined });
          }

          subscriber.nextPending = true;

          return new Promise<IteratorResult<AgentSessionEvent>>((resolve) => {
            subscriber.waiting = (result) => {
              subscriber.nextPending = false;
              resolve(result);
            };
          });
        },
        return: () => {
          subscriber.closed = true;
          subscriber.queue.length = 0;
          subscriber.waiting?.({ done: true, value: undefined });
          subscribers.delete(subscriber);

          if (subscribers.size === 0 && this.subscribers.get(sessionId) === subscribers) {
            this.subscribers.delete(sessionId);
          }

          return Promise.resolve({ done: true as const, value: undefined });
        },
      }),
    };
  }

  private pruneTerminalJournals(): void {
    while (this.terminalOrder.length > AgentSessionEventJournal.maxTerminalJournals) {
      const sessionId = this.terminalOrder.shift();

      if (sessionId !== undefined && this.terminalSessions.has(sessionId)) {
        this.events.delete(sessionId);
        this.eventBytes.delete(sessionId);
        this.terminalSessions.delete(sessionId);
      }
    }
  }

  private removeTerminalOrder(sessionId: string): void {
    for (let index = this.terminalOrder.length - 1; index >= 0; index -= 1) {
      if (this.terminalOrder[index] === sessionId) {
        this.terminalOrder.splice(index, 1);
      }
    }
  }
}
