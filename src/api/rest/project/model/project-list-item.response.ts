import { ApiProperty } from '@nestjs/swagger';

import { ProjectSummaryResponse } from './project-summary.response.js';
import { ProjectResponse } from './project.response.js';

export class ProjectListItemResponse extends ProjectResponse {
  @ApiProperty({ type: ProjectSummaryResponse })
  summary: ProjectSummaryResponse;
}
