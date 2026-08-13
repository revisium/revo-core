import { ApiProperty } from '@nestjs/swagger';

import { PageInfoResponse } from './page-info.response.js';
import { WorkPlanEdgeResponse } from './work-plan-edge.response.js';

export class WorkPlanConnectionResponse {
  @ApiProperty({ type: [WorkPlanEdgeResponse] })
  edges: WorkPlanEdgeResponse[];

  @ApiProperty({ type: PageInfoResponse })
  pageInfo: PageInfoResponse;

  @ApiProperty()
  totalCount: number;
}
