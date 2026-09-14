import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { absolutePath } from '../../filesystem/file-system-path.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { IsDirectoryQuery } from '../impl/is-directory.query.js';

@QueryHandler(IsDirectoryQuery)
export class IsDirectoryHandler implements IQueryHandler<IsDirectoryQuery, boolean> {
  constructor(private readonly filesystem: FileSystemService) {}

  async execute(query: IsDirectoryQuery): Promise<boolean> {
    return this.filesystem.isDirectory(absolutePath(query.data.path));
  }
}
