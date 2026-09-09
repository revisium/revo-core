import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import { Args, GraphQLModule, Query, Resolver, Subscription } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { GraphQLError } from 'graphql';

import { GraphqlSubscriptionTransport } from '../../src/api/graphql/subscriptions/graphql-subscription-transport.js';
import { GraphqlSubscriptionsModule } from '../../src/api/graphql/subscriptions/graphql-subscriptions.module.js';
import { GraphqlMultiplexClient } from './graphql-multiplex-client.js';

const PROBE_QUERY = 'subscription Probe($id: String!) { probeEvents(id: $id) }';

function controlledSource() {
  const queued: IteratorResult<string>[] = [];
  const released = Promise.withResolvers<void>();
  let pending: ReturnType<typeof Promise.withResolvers<IteratorResult<string>>> | undefined;

  const iterator: AsyncIterableIterator<string> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      const next = queued.shift();

      if (next !== undefined) {
        return Promise.resolve(next);
      }
      pending = Promise.withResolvers<IteratorResult<string>>();

      return pending.promise;
    },
    async return() {
      pending?.resolve({ done: true, value: undefined });
      released.resolve();

      return { done: true, value: undefined };
    },
  };

  return {
    iterator,
    released: released.promise,
    emit(value: string) {
      if (pending === undefined) {
        queued.push({ done: false, value });
      } else {
        pending.resolve({ done: false, value });
        pending = undefined;
      }
    },
    fail(error: Error) {
      if (pending === undefined) {
        throw new Error('Probe failure requires a pending source read.');
      }
      pending.reject(error);
      pending = undefined;
    },
  };
}

@Resolver()
class SubscriptionProbeResolver {
  readonly sources = new Map<string, ReturnType<typeof controlledSource>>();

  @Query(() => String)
  probe(): string {
    return 'ready';
  }

  @Subscription(() => String, { resolve: (value: string) => value })
  probeEvents(@Args('id') id: string): AsyncIterable<string> {
    const source = this.sources.get(id);

    if (source === undefined) {
      throw new GraphQLError('Unknown probe.', { extensions: { code: 'NOT_FOUND' } });
    }

    return source.iterator;
  }
}

export async function createSubscriptionTestKit() {
  const module = await Test.createTestingModule({
    imports: [
      GraphQLModule.forRootAsync<YogaDriverConfig>({
        driver: YogaDriver,
        imports: [GraphqlSubscriptionsModule],
        inject: [GraphqlSubscriptionTransport],
        useFactory: (transport: GraphqlSubscriptionTransport) => ({
          autoSchemaFile: true,
          path: '/graphql',
          plugins: transport.plugins,
        }),
      }),
    ],
    providers: [SubscriptionProbeResolver],
  }).compile();
  const app = module.createNestApplication();
  await app.listen(0, '127.0.0.1');
  const endpoint = await app.getUrl();
  const client = new GraphqlMultiplexClient(`${endpoint}/graphql/stream`);
  await client.connect();

  return {
    client,
    async subscribe(id: string) {
      const source = controlledSource();
      app.get(SubscriptionProbeResolver).sources.set(id, source);
      const response = await client.subscribe(id, PROBE_QUERY, { id });

      if (response.status !== 202) {
        throw new Error(`Probe registration failed: ${response.status}`);
      }

      return source;
    },
    subscribeUnknown: () => client.subscribe('unknown', PROBE_QUERY, { id: 'missing' }),
    standardQuery: (query: string) =>
      fetch(`${endpoint}/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
      }),
    shutdown: () => app.close(),
    async close() {
      await client.close();
      await app.close();
    },
  };
}
