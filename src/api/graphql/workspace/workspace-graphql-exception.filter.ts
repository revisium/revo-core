import { Catch } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

import { FileSystemError } from '../../../features/file-system/contracts/file-system.error.js';
import { WorkspaceError } from '../../../features/workspace/contracts/workspace.errors.js';

@Catch(WorkspaceError, FileSystemError)
export class WorkspaceGraphqlExceptionFilter implements GqlExceptionFilter {
  catch(error: WorkspaceError | FileSystemError): Error {
    return new GraphQLError(error.message, {
      extensions: { code: error.code, statusCode: error.getStatus() },
    });
  }
}
