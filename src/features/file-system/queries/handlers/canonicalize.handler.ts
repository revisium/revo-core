import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { absolutePath } from '../../filesystem/file-system-path.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { CanonicalizeQuery } from '../impl/canonicalize.query.js';

@QueryHandler(CanonicalizeQuery)
export class CanonicalizeHandler implements IQueryHandler<CanonicalizeQuery, string> {
  constructor(private readonly filesystem: FileSystemService) {}

  async execute(query: CanonicalizeQuery): Promise<string> {
    return this.filesystem.canonicalize(absolutePath(query.data.path));
  }
}
