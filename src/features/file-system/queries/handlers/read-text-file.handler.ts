import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { absolutePath } from '../../filesystem/file-system-path.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { ReadTextFileQuery } from '../impl/read-text-file.query.js';

@QueryHandler(ReadTextFileQuery)
export class ReadTextFileHandler implements IQueryHandler<ReadTextFileQuery, string> {
  constructor(private readonly filesystem: FileSystemService) {}

  async execute(query: ReadTextFileQuery): Promise<string> {
    return this.filesystem.readTextFile(absolutePath(query.data.path), 65536);
  }
}
