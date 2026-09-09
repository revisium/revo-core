import { HttpException, Logger } from '@nestjs/common';
import { GraphQLError, type ExecutionResult } from 'graphql';

import { reportErrorDiagnostic } from '../../../infrastructure/error-diagnostic.js';

const logger = new Logger('GraphqlSubscriptions');
const PUBLIC_GRAPHQL_ERROR_CODES = new Set([
  'BAD_USER_INPUT',
  'FORBIDDEN',
  'GRAPHQL_PARSE_FAILED',
  'GRAPHQL_VALIDATION_FAILED',
  'NOT_FOUND',
  'UNAUTHENTICATED',
]);

export function subscriptionError(error: unknown): GraphQLError {
  if (isPublicGraphqlError(error)) {
    return error;
  }

  if (isGraphqlError(error) && error.originalError !== undefined) {
    return subscriptionError(error.originalError);
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
      reportErrorDiagnostic(logger, { operation: 'graphql.subscription.source_cleanup' }, error);
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
        reportInternalSubscriptionError('graphql.subscription.iterator', error);
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
      reportInternalSubscriptionError('graphql.subscription.iterator_throw', error);
      await close();

      return { done: false, value: { errors: [subscriptionError(error)] } };
    },
  };
}

function reportInternalSubscriptionError(operation: string, error: unknown): void {
  if (isPublicGraphqlError(error)) {
    return;
  }

  if (isGraphqlError(error) && error.originalError !== undefined) {
    reportInternalSubscriptionError(operation, error.originalError);

    return;
  }

  if (error instanceof HttpException && error.getStatus() < 500) {
    return;
  }

  reportErrorDiagnostic(logger, { operation }, error);
}

function isPublicGraphqlError(error: unknown): error is GraphQLError {
  if (!isGraphqlError(error) || typeof error.extensions.code !== 'string') {
    return false;
  }

  if (PUBLIC_GRAPHQL_ERROR_CODES.has(error.extensions.code)) {
    return true;
  }

  return (
    typeof error.extensions.statusCode === 'number' &&
    (typeof error.extensions.path === 'string' || error.extensions.path === null) &&
    typeof error.extensions.details === 'object' &&
    error.extensions.details !== null
  );
}
