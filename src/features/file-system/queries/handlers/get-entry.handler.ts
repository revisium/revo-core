import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { absolutePath } from '../../filesystem/file-system-path.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { GetEntryQuery, type GetEntryQueryReturnType } from '../impl/get-entry.query.js';

@QueryHandler(GetEntryQuery)
export class GetEntryHandler implements IQueryHandler<GetEntryQuery, GetEntryQueryReturnType> {
  constructor(private readonly filesystem: FileSystemService) {}

  async execute(query: GetEntryQuery): Promise<GetEntryQueryReturnType> {
    return this.filesystem.entry(absolutePath(query.data.path));
  }
}
