import { ApiProperty } from '@nestjs/swagger';

import { ProjectResponse } from './project.response.js';

export class ProjectEdgeResponse {
  @ApiProperty()
  cursor: string;

  @ApiProperty({ type: ProjectResponse })
  node: ProjectResponse;
}
