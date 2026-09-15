import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProjectActiveRunsDetailsResponse } from './project-active-runs-details.response.js';

export class ProjectActiveRunsErrorResponse {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({ enum: ['project_has_active_runs'] })
  code: 'project_has_active_runs';

  @ApiProperty({ example: 'Project has active runs.' })
  message: string;

  @ApiPropertyOptional({ example: 'Stop or finish the active runs before archiving the project.' })
  description?: string;

  @ApiProperty({ example: '/projectId' })
  path: string;

  @ApiProperty({ type: ProjectActiveRunsDetailsResponse })
  details: ProjectActiveRunsDetailsResponse;
}
