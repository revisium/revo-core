import { ApiProperty } from '@nestjs/swagger';

import { WorkPlanResponse } from './work-plan.response.js';

export class WorkPlanEdgeResponse {
  @ApiProperty()
  cursor: string;

  @ApiProperty({ type: WorkPlanResponse })
  node: WorkPlanResponse;
}
