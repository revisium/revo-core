import { ArgumentsHost, BadRequestException, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';

type ErrorResponse = {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly statusCode?: unknown;
  readonly [key: string]: unknown;
};

@Catch()
export class HttpBadRequestExceptionFilter extends BaseExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost): unknown {
    if (host.getType() !== 'http') {
      return exception;
    }

    if (!(exception instanceof BadRequestException) && !isJsonParserError(exception)) {
      return super.catch(exception, host);
    }

    const response = this.responseFor(exception);
    const { httpAdapter } = this.adapterHost;
    const httpResponse = host.switchToHttp().getResponse<unknown>();

    if (!httpAdapter.isHeadersSent(httpResponse)) {
      httpAdapter.reply(httpResponse, response, 400);
    }

    return undefined;
  }

  private responseFor(exception: BadRequestException | SyntaxError): ErrorResponse {
    const response =
      exception instanceof HttpException ? exception.getResponse() : exception.message;

    if (hasErrorCode(response)) {
      return response;
    }

    if (typeof response === 'object' && response !== null) {
      return { ...response, statusCode: 400, code: 'INVALID_REQUEST' };
    }

    return { statusCode: 400, code: 'INVALID_REQUEST', message: response };
  }
}

function hasErrorCode(value: unknown): value is ErrorResponse {
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
