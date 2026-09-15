import { Catch, HttpException } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

type ProjectActiveRunsErrorResponse = {
  readonly statusCode: number;
  readonly code: 'project_has_active_runs';
  readonly message: string;
  readonly path: string;
  readonly details: { readonly runIds: readonly string[] };
};

@Catch(HttpException)
export class ProjectGraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: HttpException): Error {
    const response = exception.getResponse();

    if (!isProjectActiveRunsError(response)) {
      return exception;
    }

    return new GraphQLError(response.message, { extensions: response });
  }
}

function isProjectActiveRunsError(value: unknown): value is ProjectActiveRunsErrorResponse {
  if (!isRecord(value) || !isRecord(value.details)) {
    return false;
  }

  return (
    value.statusCode === 409 &&
    value.code === 'project_has_active_runs' &&
    typeof value.message === 'string' &&
    value.path === '/projectId' &&
    Array.isArray(value.details.runIds) &&
    value.details.runIds.every((runId) => typeof runId === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
