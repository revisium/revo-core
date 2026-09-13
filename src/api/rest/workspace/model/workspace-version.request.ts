import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceVersionRequest {
  @ApiProperty({ type: Number })
  expectedVersion: number;
}
