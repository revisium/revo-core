import { ApiProperty } from '@nestjs/swagger';

import { RequirementResponse } from './requirement.response.js';

export class RequirementEdgeResponse {
  @ApiProperty()
  cursor: string;

  @ApiProperty({ type: RequirementResponse })
  node: RequirementResponse;
}
