import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { WorkspaceType } from '../../../../features/workspace/contracts/workspace.contracts.js';

export class CreateWorkspaceRequest {
  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiProperty({ enum: WorkspaceType })
  type: WorkspaceType;

  @ApiProperty({ type: String })
  sourcePath: string;
}
