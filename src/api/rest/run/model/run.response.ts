import { ApiProperty } from '@nestjs/swagger';
import type { RunSnapshot, RunStatus, RunTerminal } from '@revisium/revo-run';

export class RunResponse implements RunSnapshot {
  @ApiProperty({ enum: ['run-snapshot/v1'] })
  schemaVersion: 'run-snapshot/v1';

  @ApiProperty()
  runId: string;

  @ApiProperty({
    enum: [
      'pending',
      'running',
      'cancelling',
      'recovery_required',
      'succeeded',
      'failed',
      'cancelled',
    ],
  })
  status: RunStatus;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  terminal: RunTerminal | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}
