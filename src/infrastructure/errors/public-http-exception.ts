import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { JsonObject } from '@revisium/revo-run';

export type PublicErrorResponse = Readonly<{
  statusCode: number;
  code: string;
  message: string;
  description?: string;
  path?: string | null;
  field?: string;
  details?: Readonly<JsonObject>;
}>;

export abstract class PublicHttpException extends HttpException {
  readonly publicResponse: PublicErrorResponse;

  protected constructor(
    response: PublicErrorResponse,
    readonly graphqlProjection: 'response' | 'minimal',
  ) {
    const body: PublicErrorResponse = Object.freeze({
      statusCode: response.statusCode,
      code: response.code,
      message: response.message,
      ...(response.description === undefined ? {} : { description: response.description }),
      ...(response.path === undefined ? {} : { path: response.path }),
      ...(response.field === undefined ? {} : { field: response.field }),
      ...(response.details === undefined ? {} : { details: response.details }),
    });
    super(body, body.statusCode);
    this.publicResponse = body;
  }
}

export function isNativePublicException(error: unknown): error is HttpException {
  return (
    error instanceof BadRequestException ||
    error instanceof NotFoundException ||
    error instanceof ConflictException ||
    error instanceof UnauthorizedException ||
    error instanceof ForbiddenException
  );
}
