import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { FileSystemPermission } from '../../contracts/file-system.contracts.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { FileSystemPolicyService } from '../../policy/file-system-policy.service.js';
import { CanonicalizeQuery } from '../impl/canonicalize.query.js';

@QueryHandler(CanonicalizeQuery)
export class CanonicalizeHandler implements IQueryHandler<CanonicalizeQuery, string> {
  constructor(
    private readonly policy: FileSystemPolicyService,
    private readonly filesystem: FileSystemService,
  ) {}

  async execute(query: CanonicalizeQuery): Promise<string> {
    const location = await this.policy.assertAllowed(
      query.context,
      FileSystemPermission.READ_METADATA,
      query.data.path,
    );

    return this.filesystem.canonicalize(location);
  }
}
