import { ApiProperty } from '@nestjs/swagger';

import { WorkspaceType } from '../../../../features/workspace/contracts/workspace.contracts.js';

export class ProjectWorkspaceSummaryResponse {
  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ enum: WorkspaceType })
  type: WorkspaceType;
}
