import { ApiProperty } from '@nestjs/swagger';

import { PageInfoResponse } from '../../share/page-info.response.js';
import { ProjectEdgeResponse } from './project-edge.response.js';

export class ProjectConnectionResponse {
  @ApiProperty({ type: [ProjectEdgeResponse] })
  edges: ProjectEdgeResponse[];

  @ApiProperty({ type: PageInfoResponse })
  pageInfo: PageInfoResponse;

  @ApiProperty()
  totalCount: number;
}
