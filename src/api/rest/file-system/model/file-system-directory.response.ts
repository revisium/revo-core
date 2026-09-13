import { ApiProperty } from '@nestjs/swagger';

import { FileSystemEntryConnectionResponse } from './file-system-entry-connection.response.js';

export class FileSystemDirectoryResponse {
  @ApiProperty({ type: () => String })
  path: string;

  @ApiProperty({ type: () => String, nullable: true })
  parentPath: string | null;

  @ApiProperty({ type: () => FileSystemEntryConnectionResponse })
  entries: FileSystemEntryConnectionResponse;
}
