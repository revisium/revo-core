import { ApiProperty } from '@nestjs/swagger';

import { ProjectListItemResponse } from './project-list-item.response.js';

export class ProjectEdgeResponse {
  @ApiProperty()
  cursor: string;

  @ApiProperty({ type: ProjectListItemResponse })
  node: ProjectListItemResponse;
}
