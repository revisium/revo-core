import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { CreateDirectoryHandler } from './commands/handlers/create-directory.handler.js';
import { FileSystemApiService } from './file-system-api.service.js';
import { FileSystemService } from './filesystem/file-system.service.js';
import { CanonicalizeHandler } from './queries/handlers/canonicalize.handler.js';
import { ExistsHandler } from './queries/handlers/exists.handler.js';
import { GetDirectoryHandler } from './queries/handlers/get-directory.handler.js';
import { GetEntryHandler } from './queries/handlers/get-entry.handler.js';
import { GetRootsHandler } from './queries/handlers/get-roots.handler.js';
import { IsDirectoryHandler } from './queries/handlers/is-directory.handler.js';
import { ReadTextFileHandler } from './queries/handlers/read-text-file.handler.js';

@Module({
  imports: [CqrsModule],
  providers: [
    ReadTextFileHandler,
    FileSystemApiService,
    FileSystemService,
    GetRootsHandler,
    GetEntryHandler,
    GetDirectoryHandler,
    ExistsHandler,
    IsDirectoryHandler,
    CanonicalizeHandler,
    CreateDirectoryHandler,
  ],
  exports: [FileSystemApiService],
})
export class FileSystemModule {}
