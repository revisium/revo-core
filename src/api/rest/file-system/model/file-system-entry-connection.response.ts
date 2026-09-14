import { ApiProperty } from '@nestjs/swagger';

import { PageInfoResponse } from '../../share/page-info.response.js';
import { FileSystemEntryEdgeResponse } from './file-system-entry-edge.response.js';

export class FileSystemEntryConnectionResponse {
  @ApiProperty({ type: () => [FileSystemEntryEdgeResponse] })
  edges: FileSystemEntryEdgeResponse[];

  @ApiProperty({ type: () => Number })
  totalCount: number;

  @ApiProperty({ type: () => PageInfoResponse })
  pageInfo: PageInfoResponse;
}
