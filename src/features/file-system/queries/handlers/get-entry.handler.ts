import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { absolutePath } from '../../filesystem/file-system-path.js';
import { FileSystemListingService } from '../../listing/file-system-listing.service.js';
import { GetEntryQuery, type GetEntryQueryReturnType } from '../impl/get-entry.query.js';

@QueryHandler(GetEntryQuery)
export class GetEntryHandler implements IQueryHandler<GetEntryQuery, GetEntryQueryReturnType> {
  constructor(private readonly listing: FileSystemListingService) {}

  async execute(query: GetEntryQuery): Promise<GetEntryQueryReturnType> {
    return this.listing.entry(absolutePath(query.data.path));
  }
}
