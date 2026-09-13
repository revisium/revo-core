import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWorkspaceRequest {
  @ApiProperty({ type: Number })
  expectedVersion: number;

  @ApiPropertyOptional({ type: String })
  name?: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiPropertyOptional({ type: String })
  sourcePath?: string;
}
