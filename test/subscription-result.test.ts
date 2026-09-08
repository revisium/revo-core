import { Logger } from '@nestjs/common';
import { GraphQLError, type ExecutionResult } from 'graphql';
import { describe, expect, test, vi } from 'vitest';

import {
  isolateSubscriptionResult,
  subscriptionError,
} from '../src/api/graphql/subscriptions/subscription-result.js';

describe('subscription operation isolation', () => {
  test('contains source cleanup rejection and closes only once after an error and cancellation', async () => {
    const cleanup = vi
      .fn<() => Promise<IteratorResult<ExecutionResult>>>()
      .mockRejectedValue(new Error('cleanup failed'));
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const source: AsyncIterableIterator<ExecutionResult> = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next: () => Promise.reject(new Error('private source failure')),
      return: cleanup,
    };
    const isolated = isolateSubscriptionResult(source);

    try {
      expect(await isolated.next()).toMatchObject({
        done: false,
        value: {
          errors: [
            { message: 'Subscription failed.', extensions: { code: 'INTERNAL_SERVER_ERROR' } },
          ],
        },
      });
      await Promise.all([isolated.return?.(), isolated.return?.()]);
      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledOnce();
    } finally {
      log.mockRestore();
    }
  });

  test('ignores late data after cancellation while a source read is pending', async () => {
    const pending = Promise.withResolvers<IteratorResult<ExecutionResult>>();
    const source: AsyncIterableIterator<ExecutionResult> = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next: () => pending.promise,
      return: () => Promise.resolve({ done: true, value: undefined }),
    };
    const isolated = isolateSubscriptionResult(source);
    const reading = isolated.next();
    await isolated.return?.();
    pending.resolve({ done: false, value: { data: { stale: true } } });
    expect(await reading).toEqual({ done: true, value: undefined });
  });

  test('preserves a domain error code with a private underlying cause', () => {
    const error = new GraphQLError('Cursor expired.', {
      extensions: { code: 'CURSOR_EXPIRED' },
      originalError: new Error('private database details'),
    });
    expect(subscriptionError(error)).toBe(error);
  });
});
