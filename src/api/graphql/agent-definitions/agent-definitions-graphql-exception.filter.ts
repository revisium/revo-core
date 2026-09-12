import { Catch } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

import {
  AgentDefinitionsApplicationError,
  AgentDefinitionsErrorCode,
} from '../../../features/agent-definitions/contracts/agent-definitions.errors.js';

const statusCode = (code: AgentDefinitionsErrorCode): number => {
  if (code === AgentDefinitionsErrorCode.invalidCursor) {
    return 400;
  }

  return 404;
};

@Catch(AgentDefinitionsApplicationError)
export class AgentDefinitionsGraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: AgentDefinitionsApplicationError): Error {
    return new GraphQLError(exception.message, {
      extensions: {
        statusCode: statusCode(exception.code),
        code: exception.code,
        path: null,
      },
    });
  }
}
