import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkspaceResultResponse {
  @ApiProperty({ type: String })
  workspaceId: string;
}
