import { ArgumentsHost, BadRequestException, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { GraphQLError } from 'graphql';

import { ApplicationError } from '../../application/errors/application-error.js';
import { publicErrorResponse } from './public-error-response.js';

@Catch()
export class PublicErrorExceptionFilter extends BaseExceptionFilter {
  private readonly adapterHost: HttpAdapterHost;

  constructor(adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
    this.adapterHost = adapterHost;
  }

  override catch(exception: unknown, host: ArgumentsHost): unknown {
    if (host.getType<string>() === 'graphql') {
      return this.graphqlError(exception);
    }

    if (exception instanceof ApplicationError) {
      const response = publicErrorResponse(exception);
      const httpResponse = host.switchToHttp().getResponse<unknown>();
      const adapter = this.adapterHost.httpAdapter;
      if (!adapter.isHeadersSent(httpResponse)) {
        adapter.reply(httpResponse, response, response.statusCode);
      }
      return undefined;
    }

    if (exception instanceof BadRequestException || isJsonParserError(exception)) {
      return this.badRequest(exception, host);
    }

    if (exception instanceof HttpException) {
      return super.catch(exception, host);
    }

    const httpResponse = host.switchToHttp().getResponse<unknown>();
    const adapter = this.adapterHost.httpAdapter;
    if (!adapter.isHeadersSent(httpResponse)) {
      adapter.reply(httpResponse, { statusCode: 500, message: 'Internal server error.' }, 500);
    }
    return undefined;
  }

  private graphqlError(exception: unknown): unknown {
    if (exception instanceof ApplicationError) {
      const response = publicErrorResponse(exception, 'graphql');
      return new GraphQLError(response.message, { extensions: response });
    }
    if (exception instanceof GraphQLError) {
      return exception;
    }
    if (exception instanceof HttpException && exception.getStatus() < 500) {
      return exception;
    }
    return new GraphQLError('Internal server error.', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  private badRequest(exception: BadRequestException | SyntaxError, host: ArgumentsHost): undefined {
    const response =
      exception instanceof HttpException ? exception.getResponse() : exception.message;
    const body = hasErrorCode(response)
      ? response
      : typeof response === 'object' && response !== null
        ? { ...response, statusCode: 400, code: 'INVALID_REQUEST' }
        : { statusCode: 400, code: 'INVALID_REQUEST', message: response };
    const httpResponse = host.switchToHttp().getResponse<unknown>();
    const adapter = this.adapterHost.httpAdapter;
    if (!adapter.isHeadersSent(httpResponse)) {
      adapter.reply(httpResponse, body, 400);
    }
    return undefined;
  }
}

function hasErrorCode(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && 'code' in value;
}

function isJsonParserError(value: unknown): value is SyntaxError {
  return (
    value instanceof SyntaxError &&
    'status' in value &&
    value.status === 400 &&
    'type' in value &&
    value.type === 'entity.parse.failed'
  );
}
