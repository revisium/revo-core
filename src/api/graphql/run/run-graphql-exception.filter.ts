import { Catch, HttpException } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

type PublicErrorResponse = {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
  readonly path: string | null;
  readonly details: Record<string, unknown>;
};

@Catch(HttpException)
export class RunGraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: HttpException): Error {
    const response = exception.getResponse();
    if (!isPublicError(response)) {
      return exception;
    }

    return new GraphQLError(response.message, { extensions: response });
  }
}

function isPublicError(value: unknown): value is PublicErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    typeof value.statusCode === 'number' &&
    'code' in value &&
    typeof value.code === 'string' &&
    'message' in value &&
    typeof value.message === 'string' &&
    'path' in value &&
    (typeof value.path === 'string' || value.path === null) &&
    'details' in value &&
    typeof value.details === 'object' &&
    value.details !== null
  );
}
