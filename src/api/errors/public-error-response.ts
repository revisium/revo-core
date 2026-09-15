import { RunErrorCode } from '../../features/run/contracts/run.errors.js';
import type { KnownApplicationFailure } from './known-application-error.js';
import { publicErrorDefinitions, type PublicErrorMetadata } from './public-error-definitions.js';
import { publicErrorPayload, type PublicErrorPayload } from './public-error-payload.js';

export type PublicErrorHttpResponse = Readonly<{
  statusCode: number;
  message: string;
  readonly [key: string]: unknown;
}>;
export type PublicErrorGraphqlResponse = Readonly<{
  message: string;
  extensions?: Readonly<Record<string, unknown>>;
}>;
export type PublicErrorResponse = Readonly<{
  http: PublicErrorHttpResponse;
  graphql: PublicErrorGraphqlResponse;
}>;

export function publicErrorResponse(failure: KnownApplicationFailure): PublicErrorResponse {
  const metadata: PublicErrorMetadata = publicErrorDefinitions[failure.code];
  const message = publicMessage(failure);
  const payload = publicErrorPayload(failure);
  const http: PublicErrorHttpResponse = {
    statusCode: metadata.status,
    message,
    ...(metadata.restError === undefined ? {} : { error: metadata.restError }),
    ...(metadata.publicCode === undefined ? {} : { code: metadata.publicCode }),
    ...(metadata.description === undefined ? {} : { description: metadata.description }),
    ...payload,
  };

  return { http, graphql: graphqlResponse(metadata, message, payload) };
}

function graphqlResponse(
  metadata: PublicErrorMetadata,
  message: string,
  payload: PublicErrorPayload,
): PublicErrorGraphqlResponse {
  if (metadata.graphql === 'plain') {
    return { message };
  }

  const extensions = {
    statusCode: metadata.status,
    ...(metadata.publicCode === undefined ? {} : { code: metadata.publicCode }),
  };

  if (metadata.graphql === 'lean') {
    return { message, extensions: { ...extensions, ...payload } };
  }

  return {
    message,
    extensions: {
      ...extensions,
      message,
      ...(metadata.description === undefined ? {} : { description: metadata.description }),
      ...payload,
    },
  };
}

function publicMessage(failure: KnownApplicationFailure): string {
  if (failure.code === RunErrorCode.selectorInvalid) {
    return publicErrorDefinitions[RunErrorCode.selectorInvalid].message[failure.details.selector];
  }

  return publicErrorDefinitions[failure.code].message;
}
