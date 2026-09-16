import { ApiProperty } from '@nestjs/swagger';

import { RunResponse } from './run.response.js';

export class RunEdgeResponse {
  @ApiProperty()
  cursor: string;

  @ApiProperty({ type: RunResponse })
  node: RunResponse;
}
