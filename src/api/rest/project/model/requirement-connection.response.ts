import { ApiProperty } from '@nestjs/swagger';

import { PageInfoResponse } from './page-info.response.js';
import { RequirementEdgeResponse } from './requirement-edge.response.js';

export class RequirementConnectionResponse {
  @ApiProperty({ type: [RequirementEdgeResponse] })
  edges: RequirementEdgeResponse[];

  @ApiProperty({ type: PageInfoResponse })
  pageInfo: PageInfoResponse;

  @ApiProperty()
  totalCount: number;
}
