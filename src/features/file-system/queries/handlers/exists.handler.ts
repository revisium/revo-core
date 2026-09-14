import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { absolutePath } from '../../filesystem/file-system-path.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { ExistsQuery } from '../impl/exists.query.js';

@QueryHandler(ExistsQuery)
export class ExistsHandler implements IQueryHandler<ExistsQuery, boolean> {
  constructor(private readonly filesystem: FileSystemService) {}

  async execute(query: ExistsQuery): Promise<boolean> {
    return this.filesystem.exists(absolutePath(query.data.path));
  }
}
