import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { FileSystemPermission } from '../../contracts/file-system.contracts.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { FileSystemPolicyService } from '../../policy/file-system-policy.service.js';
import { IsDirectoryQuery } from '../impl/is-directory.query.js';

@QueryHandler(IsDirectoryQuery)
export class IsDirectoryHandler implements IQueryHandler<IsDirectoryQuery, boolean> {
  constructor(
    private readonly policy: FileSystemPolicyService,
    private readonly filesystem: FileSystemService,
  ) {}

  async execute(query: IsDirectoryQuery): Promise<boolean> {
    const location = await this.policy.assertAllowed(
      query.context,
      FileSystemPermission.READ_METADATA,
      query.data.path,
    );

    return this.filesystem.isDirectory(location);
  }
}
