import { ApiProperty } from '@nestjs/swagger';

import { ProjectWorkspaceSummaryResponse } from './project-workspace-summary.response.js';

export class ProjectSummaryResponse {
  @ApiProperty({ type: [ProjectWorkspaceSummaryResponse] })
  workspaces: ProjectWorkspaceSummaryResponse[];

  @ApiProperty({ type: Number })
  workspaceCount: number;
}
