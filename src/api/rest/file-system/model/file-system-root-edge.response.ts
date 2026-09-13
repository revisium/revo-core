import { ApiProperty } from '@nestjs/swagger';

import { FileSystemRootResponse } from './file-system-root.response.js';

export class FileSystemRootEdgeResponse {
  @ApiProperty({ type: () => String })
  cursor: string;

  @ApiProperty({ type: () => FileSystemRootResponse })
  node: FileSystemRootResponse;
}
