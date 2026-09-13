import { ApiProperty } from '@nestjs/swagger';

import { FileSystemEntryResponse } from './file-system-entry.response.js';

export class FileSystemEntryEdgeResponse {
  @ApiProperty({ type: () => String })
  cursor: string;

  @ApiProperty({ type: () => FileSystemEntryResponse })
  node: FileSystemEntryResponse;
}
