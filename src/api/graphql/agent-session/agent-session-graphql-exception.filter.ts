import { Catch } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
} from '../../../infrastructure/agent-runtime/agent-session.errors.js';

const statusCode = (code: AgentSessionErrorCode): number => {
  if (code === AgentSessionErrorCode.invalidInput || code === AgentSessionErrorCode.invalidCursor) {
    return 400;
  }
  if (code === AgentSessionErrorCode.notFound || code === AgentSessionErrorCode.expiredCursor) {
    return 404;
  }
  if (code === AgentSessionErrorCode.conflict) {
    return 409;
  }
  if (code === AgentSessionErrorCode.unsupported) {
    return 422;
  }
  if (code === AgentSessionErrorCode.unavailable) {
    return 503;
  }
  return 500;
};

@Catch(AgentSessionApplicationError)
export class AgentSessionGraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: AgentSessionApplicationError): Error {
    return new GraphQLError(exception.message, {
      extensions: {
        statusCode: statusCode(exception.code),
        code: exception.code,
        path: null,
        details: exception.details,
      },
    });
  }
}
