import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import type { INestApplication } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  collectGraphqlSseEvents,
  openGraphqlSseSubscription,
  waitForGraphqlSseLifecycle,
} from './support/graphql-sse-client.js';
import {
  GraphqlSubscriptionProbeResolver,
  prepareCancellableSubscriptionProbe,
} from './support/graphql-subscription-probe.js';

describe('GraphQL subscription transport', () => {
  let app: INestApplication;
  let graphqlEndpoint: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<YogaDriverConfig>({
          driver: YogaDriver,
          autoSchemaFile: true,
          path: '/graphql',
        }),
      ],
      providers: [GraphqlSubscriptionProbeResolver],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    graphqlEndpoint = new URL('/graphql', await app.getUrl()).toString();
  });

  afterAll(async () => app.close());

  test('streams subscriptions over SSE on the GraphQL endpoint', async () => {
    await expect(
      collectGraphqlSseEvents(graphqlEndpoint, 'subscription { graphqlSubscriptionProbeEvents }'),
    ).resolves.toEqual([
      {
        event: 'next',
        data: { data: { graphqlSubscriptionProbeEvents: 'ready' } },
      },
      { event: 'complete' },
    ]);
  });

  test('aborts event collection when the subscription does not complete', async () => {
    const lifecycle = prepareCancellableSubscriptionProbe();

    await expect(
      collectGraphqlSseEvents(
        graphqlEndpoint,
        'subscription { graphqlCancellableSubscriptionProbeEvents }',
      ),
    ).rejects.toThrow('Timed out while collecting GraphQL SSE events.');
    await expect(
      waitForGraphqlSseLifecycle(lifecycle.unsubscribed, 'the subscription source to stop'),
    ).resolves.toBeUndefined();
  });

  test('releases the event source when the client unsubscribes', async () => {
    const lifecycle = prepareCancellableSubscriptionProbe();
    const subscription = await openGraphqlSseSubscription(
      graphqlEndpoint,
      'subscription { graphqlCancellableSubscriptionProbeEvents }',
    );

    try {
      await expect(
        waitForGraphqlSseLifecycle(lifecycle.subscribed, 'the subscription source to start'),
      ).resolves.toBeUndefined();
    } finally {
      await subscription.unsubscribe();
    }

    await expect(
      waitForGraphqlSseLifecycle(lifecycle.unsubscribed, 'the subscription source to stop'),
    ).resolves.toBeUndefined();
  });
});
