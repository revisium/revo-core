import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createSubscriptionTestKit } from './support/graphql-subscription-test-kit.js';

describe('Core multiplex subscription adapter', () => {
  let kit: Awaited<ReturnType<typeof createSubscriptionTestKit>>;

  beforeEach(async () => {
    kit = await createSubscriptionTestKit();
  });
  afterEach(async () => kit.close());

  test('cancelling an operation releases its pending source and leaves its sibling subscribed', async () => {
    const selected = await kit.subscribe('selected');
    const sibling = await kit.subscribe('sibling');

    await kit.client.cancel('selected');

    await expect(selected.released).resolves.toBeUndefined();
    sibling.emit('still subscribed');
    await expect
      .poll(() => kit.client.results('sibling'))
      .toContainEqual({ data: { probeEvents: 'still subscribed' } });
  });

  test('delivers resolver rejection as a terminal operation result', async () => {
    const sibling = await kit.subscribe('sibling');

    await kit.subscribeUnknown();

    await expect
      .poll(() => kit.client.results('unknown'))
      .toContainEqual({
        data: null,
        errors: [
          expect.objectContaining({ message: 'Unknown probe.', extensions: { code: 'NOT_FOUND' } }),
        ],
      });
    await expect.poll(() => kit.client.completed('unknown')).toBe(true);
    sibling.emit('still subscribed');
    await expect
      .poll(() => kit.client.results('sibling'))
      .toContainEqual({ data: { probeEvents: 'still subscribed' } });
  });

  test.each([
    [new BadRequestException('Invalid cursor.'), 'BAD_USER_INPUT', 'Invalid cursor.'],
    [new Error('private database failure'), 'INTERNAL_SERVER_ERROR', 'Subscription failed.'],
  ])('isolates a producer failure: %s', async (error, code, message) => {
    const failing = await kit.subscribe('failing');
    const sibling = await kit.subscribe('sibling');

    failing.fail(error);

    await expect
      .poll(() => kit.client.results('failing'))
      .toContainEqual({
        errors: [expect.objectContaining({ message, extensions: { code } })],
      });
    await expect.poll(() => kit.client.completed('failing')).toBe(true);
    await expect(failing.released).resolves.toBeUndefined();
    sibling.emit('still subscribed');
    await expect
      .poll(() => kit.client.results('sibling'))
      .toContainEqual({ data: { probeEvents: 'still subscribed' } });
  });

  test.each([
    ['malformed', 'subscription {', { message: expect.stringContaining('Syntax Error') }],
    [
      'invalid',
      'subscription { unknownField }',
      { extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } },
    ],
  ])('rejects %s GraphQL without failing existing subscriptions', async (id, query, error) => {
    const sibling = await kit.subscribe('sibling');

    const rejection = await kit.client.subscribe(id, query);
    sibling.emit('still subscribed');

    expect(rejection.status).toBe(400);
    expect(await rejection.json()).toMatchObject({ errors: [error] });
    await expect
      .poll(() => kit.client.results('sibling'))
      .toContainEqual({ data: { probeEvents: 'still subscribed' } });
  });

  test('preserves standard endpoint validation instead of applying the multiplex error adapter', async () => {
    const response = await kit.standardQuery('{ unknownField }');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      errors: [{ message: expect.stringContaining('unknownField') }],
    });
  });

  test('disconnect releases every active source', async () => {
    const first = await kit.subscribe('first');
    const second = await kit.subscribe('second');

    await kit.client.close();

    await expect(Promise.all([first.released, second.released])).resolves.toEqual([
      undefined,
      undefined,
    ]);
  });

  test('application shutdown releases an active source without waiting for client cancellation', async () => {
    const source = await kit.subscribe('active');

    await kit.shutdown();

    await expect(source.released).resolves.toBeUndefined();
  });
});
