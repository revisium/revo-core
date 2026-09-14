import { ApiProperty } from '@nestjs/swagger';

import { WorkspaceAvailability } from '../../../../features/workspace/contracts/workspace.contracts.js';

export class WorkspaceCheckResponse {
  @ApiProperty({ enum: WorkspaceAvailability })
  availability: WorkspaceAvailability;

  @ApiProperty({ type: String, nullable: true })
  errorCode: string | null;
}
