import { ApiProperty } from '@nestjs/swagger';

import { WorkspaceResponse } from './workspace.response.js';

export class WorkspaceEdgeResponse {
  @ApiProperty({ type: String })
  cursor: string;

  @ApiProperty({ type: WorkspaceResponse })
  node: WorkspaceResponse;
}
