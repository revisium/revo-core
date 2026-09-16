import { ApiProperty } from '@nestjs/swagger';

import { PageInfoResponse } from '../../share/page-info.response.js';
import { RunEdgeResponse } from './run-edge.response.js';

export class RunConnectionResponse {
  @ApiProperty({ type: [RunEdgeResponse] })
  edges: RunEdgeResponse[];

  @ApiProperty({ type: Number })
  totalCount: number;

  @ApiProperty({ type: PageInfoResponse })
  pageInfo: PageInfoResponse;
}
