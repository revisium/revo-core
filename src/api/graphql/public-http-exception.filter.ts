import { Catch } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

import {
  isNativePublicException,
  PublicHttpException,
} from '../../infrastructure/errors/public-http-exception.js';
import { isGraphqlError } from './subscriptions/subscription-result.js';

const preparedErrors = new WeakSet<GraphQLError>();

@Catch(PublicHttpException)
export class PublicHttpExceptionFilter implements GqlExceptionFilter {
  catch(exception: PublicHttpException): GraphQLError {
    const response = exception.publicResponse;
    const extensions =
      exception.graphqlProjection === 'response'
        ? response
        : {
            code: response.code,
            statusCode: response.statusCode,
            ...(response.path === undefined ? {} : { path: response.path }),
            ...(response.field === undefined ? {} : { field: response.field }),
            ...(response.description === undefined ? {} : { description: response.description }),
          };

    const error = new GraphQLError(response.message, { extensions });
    preparedErrors.add(error);

    return error;
  }
}

export function maskGraphqlError(error: unknown): GraphQLError {
  const outer = isGraphqlError(error) ? error : undefined;
  const location = {
    ...(outer?.nodes === undefined ? {} : { nodes: outer.nodes }),
    ...(outer?.source === undefined ? {} : { source: outer.source }),
    ...(outer?.positions === undefined ? {} : { positions: outer.positions }),
    ...(outer?.path === undefined ? {} : { path: outer.path }),
  };
  const visited = new Set<unknown>();
  let current = error;

  while (isGraphqlError(current) && !visited.has(current)) {
    if (preparedErrors.has(current)) {
      const prepared = new GraphQLError(current.message, {
        ...location,
        extensions: current.extensions,
      });
      preparedErrors.add(prepared);

      return prepared;
    }

    visited.add(current);

    if (current.originalError === undefined) {
      if (outer?.path === undefined) {
        return outer ?? current;
      }

      break;
    }

    current = current.originalError;
  }

  if (current instanceof PublicHttpException || isNativePublicException(current)) {
    return new GraphQLError(current.message, location);
  }

  return new GraphQLError('Unexpected error.', {
    ...location,
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  });
}
