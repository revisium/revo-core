import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  CreateDirectoryCommand,
  type CreateDirectoryCommandData,
  type CreateDirectoryCommandReturnType,
} from './commands/impl/create-directory.command.js';
import type { FileSystemAccessContext } from './contracts/file-system.contracts.js';
import {
  CanonicalizeQuery,
  type CanonicalizeQueryData,
  type CanonicalizeQueryReturnType,
} from './queries/impl/canonicalize.query.js';
import {
  ExistsQuery,
  type ExistsQueryData,
  type ExistsQueryReturnType,
} from './queries/impl/exists.query.js';
import {
  GetDirectoryQuery,
  type GetDirectoryQueryData,
  type GetDirectoryQueryReturnType,
} from './queries/impl/get-directory.query.js';
import {
  GetEntryQuery,
  type GetEntryQueryData,
  type GetEntryQueryReturnType,
} from './queries/impl/get-entry.query.js';
import {
  GetRootsQuery,
  type GetRootsQueryData,
  type GetRootsQueryReturnType,
} from './queries/impl/get-roots.query.js';
import {
  IsDirectoryQuery,
  type IsDirectoryQueryData,
  type IsDirectoryQueryReturnType,
} from './queries/impl/is-directory.query.js';
import {
  ReadTextFileQuery,
  type ReadTextFileQueryData,
  type ReadTextFileQueryReturnType,
} from './queries/impl/read-text-file.query.js';

@Injectable()
export class FileSystemApiService {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  getRoots(
    data: GetRootsQueryData,
    context?: FileSystemAccessContext,
  ): Promise<GetRootsQueryReturnType> {
    return this.queries.execute<GetRootsQuery, GetRootsQueryReturnType>(
      new GetRootsQuery(data, context),
    );
  }

  getEntry(
    data: GetEntryQueryData,
    context?: FileSystemAccessContext,
  ): Promise<GetEntryQueryReturnType> {
    return this.queries.execute<GetEntryQuery, GetEntryQueryReturnType>(
      new GetEntryQuery(data, context),
    );
  }

  getDirectory(
    data: GetDirectoryQueryData,
    context?: FileSystemAccessContext,
  ): Promise<GetDirectoryQueryReturnType> {
    return this.queries.execute<GetDirectoryQuery, GetDirectoryQueryReturnType>(
      new GetDirectoryQuery(data, context),
    );
  }

  exists(data: ExistsQueryData, context?: FileSystemAccessContext): Promise<ExistsQueryReturnType> {
    return this.queries.execute<ExistsQuery, ExistsQueryReturnType>(new ExistsQuery(data, context));
  }

  isDirectory(
    data: IsDirectoryQueryData,
    context?: FileSystemAccessContext,
  ): Promise<IsDirectoryQueryReturnType> {
    return this.queries.execute<IsDirectoryQuery, IsDirectoryQueryReturnType>(
      new IsDirectoryQuery(data, context),
    );
  }

  canonicalize(
    data: CanonicalizeQueryData,
    context?: FileSystemAccessContext,
  ): Promise<CanonicalizeQueryReturnType> {
    return this.queries.execute<CanonicalizeQuery, CanonicalizeQueryReturnType>(
      new CanonicalizeQuery(data, context),
    );
  }

  readTextFile(
    data: ReadTextFileQueryData,
    context?: FileSystemAccessContext,
  ): Promise<ReadTextFileQueryReturnType> {
    return this.queries.execute<ReadTextFileQuery, ReadTextFileQueryReturnType>(
      new ReadTextFileQuery(data, context),
    );
  }

  createDirectory(
    data: CreateDirectoryCommandData,
    context?: FileSystemAccessContext,
  ): Promise<CreateDirectoryCommandReturnType> {
    return this.commands.execute<CreateDirectoryCommand, CreateDirectoryCommandReturnType>(
      new CreateDirectoryCommand(data, context),
    );
  }
}
