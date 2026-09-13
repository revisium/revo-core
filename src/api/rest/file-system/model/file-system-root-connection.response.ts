import { ApiProperty } from '@nestjs/swagger';

import { PageInfoResponse } from '../../share/page-info.response.js';
import { FileSystemRootEdgeResponse } from './file-system-root-edge.response.js';

export class FileSystemRootConnectionResponse {
  @ApiProperty({ type: () => [FileSystemRootEdgeResponse] })
  edges: FileSystemRootEdgeResponse[];

  @ApiProperty({ type: () => Number })
  totalCount: number;

  @ApiProperty({ type: () => PageInfoResponse })
  pageInfo: PageInfoResponse;
}
