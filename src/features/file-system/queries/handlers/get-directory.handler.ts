import path from 'node:path';

import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { getOffsetPagination } from '../../../../infrastructure/pagination/get-offset-pagination.js';
import {
  FileSystemEntryType,
  type FileSystemEntry,
} from '../../contracts/file-system.contracts.js';
import { absolutePath } from '../../filesystem/file-system-path.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { FileSystemListingService } from '../../listing/file-system-listing.service.js';
import {
  GetDirectoryQuery,
  type GetDirectoryQueryReturnType,
} from '../impl/get-directory.query.js';

@QueryHandler(GetDirectoryQuery)
export class GetDirectoryHandler implements IQueryHandler<
  GetDirectoryQuery,
  GetDirectoryQueryReturnType
> {
  constructor(
    private readonly filesystem: FileSystemService,
    private readonly listing: FileSystemListingService,
  ) {}

  async execute(query: GetDirectoryQuery): Promise<GetDirectoryQueryReturnType> {
    const { data } = query;
    const location = absolutePath(data.path);
    const canonical = await this.filesystem.canonicalize(location);
    const children = await this.filesystem.readDirectory(canonical);
    const candidates = await Promise.all(
      children.map(async (child): Promise<FileSystemEntry | undefined> => {
        const requested = path.join(location, child.name);

        if (!data.includeHidden && child.name.startsWith('.')) {
          return undefined;
        }

        const entry = child.isSymlink
          ? await this.listing.entry(requested)
          : { ...child, path: requested };

        return !data.directoriesOnly || entry.type === FileSystemEntryType.DIRECTORY
          ? entry
          : undefined;
      }),
    );
    const visible = candidates.filter((entry) => entry !== undefined);

    visible.sort((left, right) => {
      if (left.name < right.name) {
        return -1;
      }

      if (left.name > right.name) {
        return 1;
      }

      return 0;
    });
    const parent = path.dirname(location);
    const parentPath = parent !== location ? parent : null;
    const entries = await getOffsetPagination({
      pageData: data,
      findMany: async ({ skip, take }) => visible.slice(skip, skip + take),
      count: async () => visible.length,
    });

    return { path: location, parentPath, entries };
  }
}
