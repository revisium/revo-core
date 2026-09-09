import { Logger } from '@nestjs/common';
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

  test('preserves a domain error code with a private underlying cause', () => {
    const error = new GraphQLError('Cursor expired.', {
      extensions: { code: 'CURSOR_EXPIRED' },
      originalError: new Error('private database details'),
    });

    const result = subscriptionError(error);

    expect(result).toMatchObject({
      message: 'Cursor expired.',
      extensions: { code: 'CURSOR_EXPIRED' },
    });
  });
});
