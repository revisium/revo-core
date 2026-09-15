import { Catch } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

import { ApplicationError } from '../../application/errors/application-error.js';
import type { ApplicationErrorCode } from '../errors/public-error-definitions.js';
import { publicErrorResponse } from '../errors/public-error-response.js';

@Catch(ApplicationError)
export class ApplicationGraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: ApplicationError<ApplicationErrorCode, object>): Error {
    const response = publicErrorResponse(exception, 'graphql');
    if (
      response.code === undefined &&
      response.path === undefined &&
      response.details === undefined
    ) {
      return new GraphQLError(response.message);
    }
    return new GraphQLError(response.message, { extensions: response });
  }
}
