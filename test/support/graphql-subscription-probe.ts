import { Query, Resolver, Subscription } from '@nestjs/graphql';

export interface GraphqlSubscriptionProbeLifecycle {
  readonly subscribed: Promise<void>;
  readonly unsubscribed: Promise<void>;
}

interface ProbeSubscriptionHooks {
  subscribed: () => void;
  unsubscribed: () => void;
}

async function* finiteProbeEvents(): AsyncGenerator<string> {
  yield 'ready';
}

const cancellableProbeEvents = (hooks: ProbeSubscriptionHooks): AsyncIterable<string> => ({
  [Symbol.asyncIterator](): AsyncIterator<string> {
    let emitted = false;
    let closed = false;
    let pending: ((result: IteratorResult<string>) => void) | undefined;

    hooks.subscribed();

    return {
      next(): Promise<IteratorResult<string>> {
        if (!emitted) {
          emitted = true;
          return Promise.resolve({ done: false, value: 'ready' });
        }

        return new Promise((resolve) => {
          pending = resolve;
        });
      },
      return(): Promise<IteratorResult<string>> {
        if (!closed) {
          closed = true;
          pending?.({ done: true, value: undefined });
          hooks.unsubscribed();
        }

        return Promise.resolve({ done: true, value: undefined });
      },
    };
  },
});

let activeCancellableProbe = cancellableProbeEvents({
  subscribed: () => undefined,
  unsubscribed: () => undefined,
});

export const prepareCancellableSubscriptionProbe = (): GraphqlSubscriptionProbeLifecycle => {
  const subscribed = Promise.withResolvers<void>();
  const unsubscribed = Promise.withResolvers<void>();
  activeCancellableProbe = cancellableProbeEvents({
    subscribed: subscribed.resolve,
    unsubscribed: unsubscribed.resolve,
  });

  return {
    subscribed: subscribed.promise,
    unsubscribed: unsubscribed.promise,
  };
};

@Resolver()
export class GraphqlSubscriptionProbeResolver {
  @Query(() => String)
  graphqlSubscriptionProbe(): string {
    return 'ready';
  }

  @Subscription(() => String, { resolve: (value: string) => value })
  graphqlSubscriptionProbeEvents(): AsyncIterable<string> {
    return finiteProbeEvents();
  }

  @Subscription(() => String, { resolve: (value: string) => value })
  graphqlCancellableSubscriptionProbeEvents(): AsyncIterable<string> {
    return activeCancellableProbe;
  }
}
