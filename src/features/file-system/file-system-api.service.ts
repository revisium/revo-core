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
} from './queries/impl/canonicalize.query.js';
import { ExistsQuery, type ExistsQueryData } from './queries/impl/exists.query.js';
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
import { IsDirectoryQuery, type IsDirectoryQueryData } from './queries/impl/is-directory.query.js';
import {
  ReadTextFileQuery,
  type ReadTextFileQueryData,
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

  exists(data: ExistsQueryData, context?: FileSystemAccessContext): Promise<boolean> {
    return this.queries.execute<ExistsQuery, boolean>(new ExistsQuery(data, context));
  }

  isDirectory(data: IsDirectoryQueryData, context?: FileSystemAccessContext): Promise<boolean> {
    return this.queries.execute<IsDirectoryQuery, boolean>(new IsDirectoryQuery(data, context));
  }

  canonicalize(data: CanonicalizeQueryData, context?: FileSystemAccessContext): Promise<string> {
    return this.queries.execute<CanonicalizeQuery, string>(new CanonicalizeQuery(data, context));
  }

  readTextFile(data: ReadTextFileQueryData, context?: FileSystemAccessContext): Promise<string> {
    return this.queries.execute<ReadTextFileQuery, string>(new ReadTextFileQuery(data, context));
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
