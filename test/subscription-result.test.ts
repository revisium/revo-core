import { BadRequestException, Logger } from '@nestjs/common';
import { GraphQLError, type ExecutionResult } from 'graphql';
import { describe, expect, test, vi } from 'vitest';

import {
  isolateSubscriptionResult,
  subscriptionError,
} from '../src/api/graphql/subscriptions/subscription-result.js';

type ReadResult = () => Promise<IteratorResult<ExecutionResult>>;

function source(next: ReadResult, close: ReadResult): AsyncIterableIterator<ExecutionResult> {
  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next,
    return: close,
  };
}

describe('subscription operation isolation', () => {
  test('settles one source cleanup across failure and repeated cancellation', async () => {
    const cleanup = vi.fn<ReadResult>().mockRejectedValue(new Error('cleanup failed'));
    const isolated = isolateSubscriptionResult(
      source(() => Promise.reject(new Error('source failure')), cleanup),
    );
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    try {
      await expect(isolated.next()).resolves.toMatchObject({ done: false });
      await Promise.all([isolated.return?.(), isolated.return?.()]);

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledTimes(2);
      expect(log.mock.calls.map(([entry]) => entry)).toEqual([
        expect.objectContaining({ operation: 'graphql.subscription.iterator' }),
        expect.objectContaining({ operation: 'graphql.subscription.source_cleanup' }),
      ]);
    } finally {
      log.mockRestore();
    }
  });

  test('ignores late data after cancellation while a source read is pending', async () => {
    const pending = Promise.withResolvers<IteratorResult<ExecutionResult>>();
    const isolated = isolateSubscriptionResult(
      source(
        () => pending.promise,
        () => Promise.resolve({ done: true, value: undefined }),
      ),
    );

    const reading = isolated.next();
    await isolated.return?.();
    pending.resolve({ done: false, value: { data: { stale: true } } });

    await expect(reading).resolves.toEqual({ done: true, value: undefined });
  });

  test('preserves a known public error code with a private underlying cause', () => {
    const error = new GraphQLError('Invalid cursor.', {
      extensions: { code: 'BAD_USER_INPUT' },
      originalError: new Error('private database details'),
    });

    const result = subscriptionError(error);

    expect(result).toMatchObject({
      message: 'Invalid cursor.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  test('logs and masks an internal GraphQL error from next()', async () => {
    const internal = new GraphQLError('database password=private', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
      originalError: new Error('driver access_token=private-token'),
    });
    const isolated = isolateSubscriptionResult(
      source(
        () => Promise.reject(internal),
        () => Promise.resolve({ done: true, value: undefined }),
      ),
    );
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(isolated.next()).resolves.toMatchObject({
      value: {
        errors: [
          expect.objectContaining({
            message: 'Subscription failed.',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          }),
        ],
      },
    });
    expect(log).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ operation: 'graphql.subscription.iterator' }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-token');

    log.mockRestore();
  });

  test('logs and masks an internal failure passed to throw()', async () => {
    const isolated = isolateSubscriptionResult(
      source(
        () => Promise.resolve({ done: true, value: undefined }),
        () => Promise.resolve({ done: true, value: undefined }),
      ),
    );
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(
      isolated.throw?.(
        new GraphQLError('private password=private', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        }),
      ),
    ).resolves.toMatchObject({
      value: {
        errors: [
          expect.objectContaining({
            message: 'Subscription failed.',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          }),
        ],
      },
    });
    expect(log).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ operation: 'graphql.subscription.iterator_throw' }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('password=private');

    log.mockRestore();
  });

  test('keeps a known public GraphQL failure from throw() without logging it', async () => {
    const isolated = isolateSubscriptionResult(
      source(
        () => Promise.resolve({ done: true, value: undefined }),
        () => Promise.resolve({ done: true, value: undefined }),
      ),
    );
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(
      isolated.throw?.(new GraphQLError('Unknown probe.', { extensions: { code: 'NOT_FOUND' } })),
    ).resolves.toMatchObject({
      value: {
        errors: [
          expect.objectContaining({ message: 'Unknown probe.', extensions: { code: 'NOT_FOUND' } }),
        ],
      },
    });
    expect(log).not.toHaveBeenCalled();

    log.mockRestore();
  });

  test('does not log an expected client failure from the source', async () => {
    const isolated = isolateSubscriptionResult(
      source(
        () => Promise.reject(new BadRequestException('Invalid cursor.')),
        () => Promise.resolve({ done: true, value: undefined }),
      ),
    );
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(isolated.next()).resolves.toMatchObject({
      value: {
        errors: [
          expect.objectContaining({
            message: 'Invalid cursor.',
            extensions: { code: 'BAD_USER_INPUT' },
          }),
        ],
      },
    });
    expect(log).not.toHaveBeenCalled();
  });
});
