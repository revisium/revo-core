import { ApiProperty } from '@nestjs/swagger';

import { AdrEdgeResponse } from './adr-edge.response.js';
import { PageInfoResponse } from './page-info.response.js';

export class AdrConnectionResponse {
  @ApiProperty({ type: [AdrEdgeResponse] })
  edges: AdrEdgeResponse[];

  @ApiProperty({ type: PageInfoResponse })
  pageInfo: PageInfoResponse;

  @ApiProperty()
  totalCount: number;
}
