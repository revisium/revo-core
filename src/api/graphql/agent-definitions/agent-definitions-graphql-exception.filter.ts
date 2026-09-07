import { Catch } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import { AgentManagerError } from '@revisium/revo-agent-runtime';
import { GraphQLError } from 'graphql';

import {
  AgentDefinitionsApplicationError,
  AgentDefinitionsErrorCode,
  mapAgentDefinitionsError,
} from '../../../features/agent-definitions/contracts/agent-definitions.errors.js';

const statusCode = (code: AgentDefinitionsErrorCode): number => {
  if (
    code === AgentDefinitionsErrorCode.invalidInput ||
    code === AgentDefinitionsErrorCode.invalidCursor
  ) {
    return 400;
  }

  if (
    code === AgentDefinitionsErrorCode.notFound ||
    code === AgentDefinitionsErrorCode.expiredCursor
  ) {
    return 404;
  }

  if (code === AgentDefinitionsErrorCode.conflict) {
    return 409;
  }

  if (code === AgentDefinitionsErrorCode.unsupported) {
    return 422;
  }

  if (code === AgentDefinitionsErrorCode.unavailable) {
    return 503;
  }

  return 500;
};

@Catch(AgentDefinitionsApplicationError, AgentManagerError)
export class AgentDefinitionsGraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: AgentDefinitionsApplicationError | AgentManagerError): Error {
    const mapped = mapAgentDefinitionsError(exception);

    return new GraphQLError(mapped.message, {
      extensions: {
        statusCode: statusCode(mapped.code),
        code: mapped.code,
        path: null,
        details: mapped.details,
      },
    });
  }
}
