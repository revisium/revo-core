import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { getOffsetPagination } from '../../../../infrastructure/pagination/get-offset-pagination.js';
import type { FileSystemRoot } from '../../contracts/file-system.contracts.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { GetRootsQuery, type GetRootsQueryReturnType } from '../impl/get-roots.query.js';

@QueryHandler(GetRootsQuery)
export class GetRootsHandler implements IQueryHandler<GetRootsQuery, GetRootsQueryReturnType> {
  constructor(private readonly filesystem: FileSystemService) {}

  async execute(query: GetRootsQuery): Promise<GetRootsQueryReturnType> {
    const roots: FileSystemRoot[] = await this.filesystem.getRoots();

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
