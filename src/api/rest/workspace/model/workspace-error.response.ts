import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { WorkspaceInputField } from '../../../../features/workspace/contracts/workspace.errors.js';

export class WorkspaceErrorResponse {
  @ApiProperty({ type: String })
  code: string;

  @ApiProperty({ type: 'integer' })
  statusCode: number;

  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  message: string | string[];

  @ApiPropertyOptional({ type: String })
  field?: WorkspaceInputField;
}
