import { ApiProperty } from '@nestjs/swagger';
import type { RunErrorCode } from '@revisium/revo-run';

export class RunErrorResponse {
  @ApiProperty({
    enum: ['execution_failed', 'workflow_failed', 'recovery_exhausted', 'invalid_workflow_state'],
  })
  code: RunErrorCode;

  @ApiProperty()
  message: string;
}
