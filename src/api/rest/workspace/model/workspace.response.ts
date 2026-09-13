import { ApiProperty } from '@nestjs/swagger';

import {
  WorkspaceType,
  WorkspaceAvailability,
} from '../../../../features/workspace/contracts/workspace.contracts.js';

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

  @ApiProperty({ enum: WorkspaceAvailability })
  availability: WorkspaceAvailability;

  @ApiProperty({ type: String, nullable: true })
  lastCheckedAt: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastErrorCode: string | null;

  @ApiProperty({ type: Number })
  version: number;

  @ApiProperty({ type: String })
  createdAt: string;

  @ApiProperty({ type: String })
  updatedAt: string;

  @ApiProperty({ type: String, nullable: true })
  disconnectedAt: string | null;
}
