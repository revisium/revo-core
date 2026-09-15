import { HttpException, Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';

import type {
  PublicErrorGraphqlResponse,
  PublicErrorResponse,
} from '../errors/public-error-response.js';

@Injectable()
export class ApplicationGraphqlExceptionFilter {
  catch(exception: unknown, response?: PublicErrorResponse): unknown {
    if (response !== undefined) {
      return this.reply(response.graphql);
    }

    if (exception instanceof GraphQLError) {
      return exception;
    }

    if (exception instanceof HttpException && exception.getStatus() < 500) {
      return exception;
    }

    return this.reply({
      message: 'Internal server error.',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  private reply(response: PublicErrorGraphqlResponse): GraphQLError {
    return new GraphQLError(
      response.message,
      response.extensions === undefined ? undefined : { extensions: response.extensions },
    );
  }
}
