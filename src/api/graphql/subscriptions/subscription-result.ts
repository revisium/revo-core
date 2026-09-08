import { HttpException, Logger } from '@nestjs/common';
import { GraphQLError, type ExecutionResult } from 'graphql';

const logger = new Logger('GraphqlSubscriptions');

export function subscriptionError(error: unknown): GraphQLError {
  if (isGraphqlError(error) && typeof error.extensions.code === 'string') {
    return error;
  }

  if (isGraphqlError(error) && error.originalError !== undefined) {
    return subscriptionError(error.originalError);
  }

  if (isGraphqlError(error)) {
    return error;
  }

  if (error instanceof HttpException && error.getStatus() < 500) {
    return new GraphQLError(error.message, {
      extensions: { code: error.getStatus() === 404 ? 'NOT_FOUND' : 'BAD_USER_INPUT' },
    });
  }

  return new GraphQLError('Subscription failed.', {
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  });
}

// GraphQL's CJS and ESM exports have different constructors but share this built-in tag.
export function isGraphqlError(error: unknown): error is GraphQLError {
  return Object.prototype.toString.call(error) === '[object GraphQLError]';
}

// graphql-sse otherwise propagates an iterator rejection to every operation on the stream.
// An explicit iterator keeps return() interruptible while next() is waiting for an event.
export function isolateSubscriptionResult(
  source: AsyncIterable<ExecutionResult>,
): AsyncIterableIterator<ExecutionResult> {
  const iterator = source[Symbol.asyncIterator]();
  let stopped = false;
  let closing: Promise<void> | undefined;
  const close = () => (closing ??= closeSource());
  const closeSource = async () => {
    try {
      await iterator.return?.();
    } catch (error) {
      logger.error('Subscription source cleanup failed.', error);
    }
  };

  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      if (stopped) {
        return { done: true, value: undefined };
      }

      try {
        const result = await iterator.next();

        return stopped ? { done: true, value: undefined } : result;
      } catch (error) {
        if (stopped) {
          return { done: true, value: undefined };
        }
        stopped = true;
        await close();

        return { done: false, value: { errors: [subscriptionError(error)] } };
      }
    },
    async return() {
      stopped = true;
      await close();

      return { done: true, value: undefined };
    },
    async throw(error: unknown) {
      stopped = true;
      await close();

      return { done: false, value: { errors: [subscriptionError(error)] } };
    },
  };
}
