import path from 'node:path';

import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { getOffsetPagination } from '../../../../infrastructure/pagination/get-offset-pagination.js';
import {
  FileSystemPermission,
  FileSystemRootType,
  type FileSystemRoot,
} from '../../contracts/file-system.contracts.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { FileSystemListingService } from '../../listing/file-system-listing.service.js';
import { FileSystemAccessContext as FileSystemAccessContextImplementation } from '../../policy/file-system-access-context.js';
import { absolutePath } from '../../policy/file-system-path.js';
import { GetRootsQuery, type GetRootsQueryReturnType } from '../impl/get-roots.query.js';

@QueryHandler(GetRootsQuery)
export class GetRootsHandler implements IQueryHandler<GetRootsQuery, GetRootsQueryReturnType> {
  constructor(
    private readonly filesystem: FileSystemService,
    private readonly listing: FileSystemListingService,
  ) {}

  async execute(query: GetRootsQuery): Promise<GetRootsQueryReturnType> {
    const scopes =
      query.context instanceof FileSystemAccessContextImplementation
        ? query.context.policies.flatMap((policy) => policy.scopes)
        : [];
    const candidates = scopes.length ? await this.filesystem.getRoots() : [];

    for (const scope of scopes) {
      const location = absolutePath(scope.rootPath);

      if (!candidates.some((root) => path.relative(root.path, location) === '')) {
        candidates.push({
          name: path.basename(location) || location,
          path: location,
          type: FileSystemRootType.SCOPE,
        });
      }
    }

    const visible = await Promise.all(
      candidates.map(async (root): Promise<FileSystemRoot | undefined> => {
        if (
          (await this.listing.visible(query.context, root.path, FileSystemPermission.LIST)) &&
          (await this.filesystem.isDirectory(root.path))
        ) {
          return root;
        }

        return undefined;
      }),
    );
    const roots = visible.filter((root) => root !== undefined);

    roots.sort((left, right) => {
      if (left.path < right.path) {
        return -1;
      }

      if (left.path > right.path) {
        return 1;
      }

      return 0;
    });

    return getOffsetPagination({
      pageData: query.data,
      findMany: async ({ skip, take }) => roots.slice(skip, skip + take),
      count: async () => roots.length,
    });
  }
}
