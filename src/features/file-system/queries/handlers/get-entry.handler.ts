import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { FileSystemListingService } from '../../listing/file-system-listing.service.js';
import { absolutePath } from '../../policy/file-system-path.js';
import { GetEntryQuery, type GetEntryQueryReturnType } from '../impl/get-entry.query.js';

@QueryHandler(GetEntryQuery)
export class GetEntryHandler implements IQueryHandler<GetEntryQuery, GetEntryQueryReturnType> {
  constructor(private readonly listing: FileSystemListingService) {}

  async execute(query: GetEntryQuery): Promise<GetEntryQueryReturnType> {
    return this.listing.entry(query.context, absolutePath(query.data.path));
  }
}
