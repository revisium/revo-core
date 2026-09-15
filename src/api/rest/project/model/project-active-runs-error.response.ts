import { ApiProperty } from '@nestjs/swagger';

import { ProjectActiveRunsDetailsResponse } from './project-active-runs-details.response.js';

export class ProjectActiveRunsErrorResponse {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({ enum: ['project_has_active_runs'] })
  code: 'project_has_active_runs';

  @ApiProperty({ example: 'Project has active runs.' })
  message: string;

  @ApiProperty({ example: '/projectId' })
  path: string;

  @ApiProperty({ type: ProjectActiveRunsDetailsResponse })
  details: ProjectActiveRunsDetailsResponse;
}
