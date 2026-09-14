import { ApiProperty } from '@nestjs/swagger';

import { PageInfoResponse } from '../../share/page-info.response.js';
import { WorkspaceEdgeResponse } from './workspace-edge.response.js';

export class WorkspaceConnectionResponse {
  @ApiProperty({ type: [WorkspaceEdgeResponse] })
  edges: WorkspaceEdgeResponse[];

  @ApiProperty({ type: Number })
  totalCount: number;

  @ApiProperty({ type: PageInfoResponse })
  pageInfo: PageInfoResponse;
}
