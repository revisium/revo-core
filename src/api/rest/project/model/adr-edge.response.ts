import { ApiProperty } from '@nestjs/swagger';

import { AdrResponse } from './adr.response.js';

export class AdrEdgeResponse {
  @ApiProperty()
  cursor: string;

  @ApiProperty({ type: AdrResponse })
  node: AdrResponse;
}
