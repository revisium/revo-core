import { Catch } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

import { FileSystemError } from '../../../features/file-system/contracts/file-system.error.js';

@Catch(FileSystemError)
export class FileSystemGraphqlExceptionFilter implements GqlExceptionFilter {
  catch(error: FileSystemError): Error {
    return new GraphQLError(error.message, {
      extensions: { code: error.code, statusCode: error.getStatus() },
    });
  }
}
