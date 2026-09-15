import { ArgumentsHost, BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';

import type { PublicErrorResponse } from '../errors/public-error-response.js';

type FrameworkErrorResponse = Readonly<Record<string, unknown>>;

@Injectable()
export class ApplicationHttpExceptionFilter extends BaseExceptionFilter {
  constructor(private readonly host: HttpAdapterHost) {
    super(host.httpAdapter);
  }

  override catch(exception: unknown, context: ArgumentsHost, response?: PublicErrorResponse): void {
    if (response !== undefined) {
      return this.reply(response.http, response.http.statusCode, context);
    }

    if (exception instanceof BadRequestException || isJsonParserError(exception)) {
      return this.reply(badRequestResponse(exception), 400, context);
    }

    if (exception instanceof HttpException) {
      return super.catch(exception, context);
    }

    return this.reply({ statusCode: 500, message: 'Internal server error.' }, 500, context);
  }

  private reply(body: object, status: number, context: ArgumentsHost): void {
    const http = context.switchToHttp().getResponse<unknown>();

    if (!this.host.httpAdapter.isHeadersSent(http)) {
      this.host.httpAdapter.reply(http, body, status);
    }
  }
}

function badRequestResponse(exception: BadRequestException | SyntaxError): FrameworkErrorResponse {
  const response = exception instanceof HttpException ? exception.getResponse() : exception.message;

  if (typeof response === 'object' && response !== null) {
    if ('code' in response) {
      return response;
    }

    return { ...response, statusCode: 400, code: 'INVALID_REQUEST' };
  }

  return { statusCode: 400, code: 'INVALID_REQUEST', message: response };
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
