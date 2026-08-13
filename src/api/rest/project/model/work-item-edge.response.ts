import { ApiProperty } from '@nestjs/swagger';

import { WorkItemResponse } from './work-item.response.js';

export class WorkItemEdgeResponse {
  @ApiProperty()
  cursor: string;

  @ApiProperty({ type: WorkItemResponse })
  node: WorkItemResponse;
}
