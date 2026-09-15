import { RunErrorCode } from '../../features/run/contracts/run.errors.js';
import type { KnownApplicationFailure } from './known-application-error.js';
import { publicErrorDefinitions, type PublicErrorMetadata } from './public-error-definitions.js';
import { publicErrorPayload } from './public-error-payload.js';

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
  const graphqlPayload =
    metadata.graphql === 'plain'
      ? undefined
      : metadata.graphql === 'lean'
        ? {
            statusCode: metadata.status,
            ...(metadata.publicCode === undefined ? {} : { code: metadata.publicCode }),
            ...payload,
          }
        : {
            statusCode: metadata.status,
            ...(metadata.publicCode === undefined ? {} : { code: metadata.publicCode }),
            message,
            ...(metadata.description === undefined ? {} : { description: metadata.description }),
            ...payload,
          };

  return {
    http,
    graphql: { message, ...(graphqlPayload === undefined ? {} : { extensions: graphqlPayload }) },
  };
}

function publicMessage(failure: KnownApplicationFailure): string {
  if (failure.code === RunErrorCode.selectorInvalid) {
    return publicErrorDefinitions[RunErrorCode.selectorInvalid].message[failure.details.selector];
  }

  return publicErrorDefinitions[failure.code].message;
}
