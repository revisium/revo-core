import { ApiProperty } from '@nestjs/swagger';

import { PageInfoResponse } from '../../share/page-info.response.js';
import { AdrEdgeResponse } from './adr-edge.response.js';

export class AdrConnectionResponse {
  @ApiProperty({ type: [AdrEdgeResponse] })
  edges: AdrEdgeResponse[];

  @ApiProperty({ type: PageInfoResponse })
  pageInfo: PageInfoResponse;

  @ApiProperty()
  totalCount: number;
}
