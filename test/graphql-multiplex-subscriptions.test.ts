import { YogaDriver, type YogaDriverConfig } from '@graphql-yoga/nestjs';
import { BadRequestException, type INestApplication } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { GraphqlSubscriptionTransport } from '../src/api/graphql/subscriptions/graphql-subscription-transport.js';
import { GraphqlSubscriptionsModule } from '../src/api/graphql/subscriptions/graphql-subscriptions.module.js';
import { GraphqlMultiplexClient } from './support/graphql-multiplex-client.js';
import { MultiplexProbeSources } from './support/graphql-multiplex-probe-sources.js';
import { GraphqlMultiplexProbeResolver } from './support/graphql-multiplex-probe.js';

const QUERY = 'subscription Probe($id: String!) { multiplexProbeEvents(id: $id) }';

describe('GraphQL multiplex subscriptions', () => {
  let app: INestApplication;
  let client: GraphqlMultiplexClient;
  let probes: MultiplexProbeSources;

  beforeEach(async () => {
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
      providers: [GraphqlMultiplexProbeResolver, MultiplexProbeSources],
    }).compile();
    app = module.createNestApplication();
    probes = app.get(MultiplexProbeSources);
    await app.listen(0, '127.0.0.1');
    client = new GraphqlMultiplexClient(`${await app.getUrl()}/graphql/stream`);
    await client.connect();
  });

  afterEach(async () => {
    await client.close();
    await app.close();
  });

  test('multiplexes two operations on one GET and cancels only the selected operation', async () => {
    const first = probes.add('first');
    const second = probes.add('second');
    expect((await client.subscribe('one', QUERY, { id: 'first' })).status).toBe(202);
    expect((await client.subscribe('two', QUERY, { id: 'second' })).status).toBe(202);
    first.emit('first event');
    second.emit('second event');
    await expect.poll(() => client.events).toContainEqual(next('one', 'first event'));
    await expect.poll(() => client.events).toContainEqual(next('two', 'second event'));
    expect((await client.cancel('one')).status).toBe(200);
    await first.released.promise;
    second.emit('still subscribed');
    await expect.poll(() => client.events).toContainEqual(next('two', 'still subscribed'));
  });

  test('natural completion and an unknown operation leave the other subscription alive', async () => {
    const first = probes.add('first');
    const second = probes.add('second');
    await client.subscribe('one', QUERY, { id: 'first' });
    await client.subscribe('two', QUERY, { id: 'second' });
    first.complete();
    await expect
      .poll(() => client.events)
      .toContainEqual({ event: 'complete', data: { id: 'one' } });
    const rejected = await client.subscribe('bad', QUERY, { id: 'missing' });
    expect(rejected.status).toBe(202);
    await expect
      .poll(() => client.events)
      .toContainEqual({
        event: 'next',
        data: {
          id: 'bad',
          payload: {
            data: null,
            errors: [expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })],
          },
        },
      });
    second.emit('still subscribed');
    await expect.poll(() => client.events).toContainEqual(next('two', 'still subscribed'));
  });

  test.each([
    [new BadRequestException('Invalid cursor.'), 'BAD_USER_INPUT', 'Invalid cursor.'],
    [new Error('postgres secret'), 'INTERNAL_SERVER_ERROR', 'Subscription failed.'],
  ])(
    'isolates rejected iterators and emits safe terminal errors: %s',
    async (error, code, message) => {
      const first = probes.add('first');
      const second = probes.add('second');
      await client.subscribe('one', QUERY, { id: 'first' });
      await client.subscribe('two', QUERY, { id: 'second' });
      first.fail(error);
      await expect
        .poll(() => client.events)
        .toContainEqual({
          event: 'next',
          data: {
            id: 'one',
            payload: { errors: [expect.objectContaining({ message, extensions: { code } })] },
          },
        });
      await expect
        .poll(() => client.events)
        .toContainEqual({ event: 'complete', data: { id: 'one' } });
      await first.released.promise;
      second.emit('still subscribed');
      await expect.poll(() => client.events).toContainEqual(next('two', 'still subscribed'));
    },
  );

  test('rejects malformed GraphQL without failing the shared stream', async () => {
    const source = probes.add('first');
    await client.subscribe('one', QUERY, { id: 'first' });
    const rejected = await client.subscribe('invalid', 'subscription {');
    expect(rejected.status).toBe(400);
    expect(await rejected.json()).toMatchObject({
      errors: [{ message: expect.stringContaining('Syntax Error') }],
    });
    source.emit('still subscribed');
    await expect.poll(() => client.events).toContainEqual(next('one', 'still subscribed'));
  });

  test('returns a permanent validation code and keeps standard GraphQL validation unchanged', async () => {
    const source = probes.add('first');
    await client.subscribe('one', QUERY, { id: 'first' });
    const invalid = await client.subscribe('unknown-field', 'subscription { unknownField }');
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      errors: [
        {
          message: expect.stringContaining('unknownField'),
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
        },
      ],
    });
    const standard = await fetch(`${await app.getUrl()}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ unknownField }' }),
    });
    expect(standard.status).toBe(200);
    expect(await standard.json()).toMatchObject({
      errors: [{ message: expect.stringContaining('unknownField') }],
    });
    source.emit('still subscribed');
    await expect.poll(() => client.events).toContainEqual(next('one', 'still subscribed'));
  });

  test('disconnect releases every active source', async () => {
    const first = probes.add('first');
    const second = probes.add('second');
    await client.subscribe('one', QUERY, { id: 'first' });
    await client.subscribe('two', QUERY, { id: 'second' });
    await client.close();
    await expect(Promise.all([first.released.promise, second.released.promise])).resolves.toEqual([
      undefined,
      undefined,
    ]);
  });

  test('application shutdown closes the stream and releases active sources', async () => {
    const source = probes.add('first');
    await client.subscribe('one', QUERY, { id: 'first' });
    await app.close();
    await expect(source.released.promise).resolves.toBeUndefined();
  });
});

function next(id: string, value: string) {
  return { event: 'next', data: { id, payload: { data: { multiplexProbeEvents: value } } } };
}
