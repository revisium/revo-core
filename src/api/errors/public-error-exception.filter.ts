import { ArgumentsHost, Catch, Injectable } from '@nestjs/common';

import { ApplicationGraphqlExceptionFilter } from '../graphql/application-graphql-exception.filter.js';
import { ApplicationHttpExceptionFilter } from '../rest/application-http-exception.filter.js';
import { knownApplicationFailure } from './known-application-error.js';
import { publicErrorResponse } from './public-error-response.js';

@Injectable()
@Catch()
export class PublicErrorExceptionFilter {
  constructor(
    private readonly http: ApplicationHttpExceptionFilter,
    private readonly graphql: ApplicationGraphqlExceptionFilter,
  ) {}

  catch(exception: unknown, context: ArgumentsHost): unknown {
    const failure = knownApplicationFailure(exception);
    const response = failure === undefined ? undefined : publicErrorResponse(failure);

    return context.getType<string>() === 'graphql'
      ? this.graphql.catch(exception, response)
      : this.http.catch(exception, context, response);
  }
}
