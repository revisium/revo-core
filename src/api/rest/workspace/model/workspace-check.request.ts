import { ApiProperty } from '@nestjs/swagger';

import { WorkspaceType } from '../../../../features/workspace/contracts/workspace.contracts.js';

export class WorkspaceCheckRequest {
  @ApiProperty({ enum: WorkspaceType })
  type: WorkspaceType;

  @ApiProperty({ type: String })
  sourcePath: string;
}
