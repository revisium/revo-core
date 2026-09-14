import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { FileSystemPermission } from '../../contracts/file-system.contracts.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { FileSystemPolicyService } from '../../policy/file-system-policy.service.js';
import { ReadTextFileQuery } from '../impl/read-text-file.query.js';

@QueryHandler(ReadTextFileQuery)
export class ReadTextFileHandler implements IQueryHandler<ReadTextFileQuery, string> {
  constructor(
    private readonly policy: FileSystemPolicyService,
    private readonly filesystem: FileSystemService,
  ) {}

  async execute(query: ReadTextFileQuery): Promise<string> {
    const location = await this.policy.assertAllowed(
      query.context,
      FileSystemPermission.READ_FILE,
      query.data.path,
    );

    return this.filesystem.readTextFile(location, 65536);
  }
}
