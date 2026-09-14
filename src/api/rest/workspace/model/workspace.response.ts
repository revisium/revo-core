import { ApiProperty } from '@nestjs/swagger';

import { WorkspaceType } from '../../../../features/workspace/contracts/workspace.contracts.js';

export class WorkspaceResponse {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  projectId: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  description: string;

  @ApiProperty({ enum: WorkspaceType })
  type: WorkspaceType;

  @ApiProperty({ type: String })
  sourcePath: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;

  @ApiProperty({ type: Boolean })
  isArchived: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt: string | null;
}
