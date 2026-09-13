import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { FileSystemPermission } from '../../contracts/file-system.contracts.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { FileSystemPolicyService } from '../../policy/file-system-policy.service.js';
import { ExistsQuery, type ExistsQueryReturnType } from '../impl/exists.query.js';

@QueryHandler(ExistsQuery)
export class ExistsHandler implements IQueryHandler<ExistsQuery, ExistsQueryReturnType> {
  constructor(
    private readonly policy: FileSystemPolicyService,
    private readonly filesystem: FileSystemService,
  ) {}

  async execute(query: ExistsQuery): Promise<ExistsQueryReturnType> {
    const location = await this.policy.assertAllowed(
      query.context,
      FileSystemPermission.READ_METADATA,
      query.data.path,
    );

    return this.filesystem.exists(location);
  }
}
