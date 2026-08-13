import { ApiProperty } from '@nestjs/swagger';

import { PageInfoResponse } from './page-info.response.js';
import { WorkItemEdgeResponse } from './work-item-edge.response.js';

export class WorkItemConnectionResponse {
  @ApiProperty({ type: [WorkItemEdgeResponse] })
  edges: WorkItemEdgeResponse[];

  @ApiProperty({ type: PageInfoResponse })
  pageInfo: PageInfoResponse;

  @ApiProperty()
  totalCount: number;
}
