import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWorkspaceRequest {
  @ApiPropertyOptional({ type: String })
  name?: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiPropertyOptional({ type: String })
  sourcePath?: string;
}
