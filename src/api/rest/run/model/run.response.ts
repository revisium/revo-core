import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { JsonValue } from '@revisium/revo-pipeline';
import type { ExecutionPlan, RunStatus } from '@revisium/revo-run';

import { JSON_VALUE_SCHEMA } from '../../share/json-value.schema.js';
import { RunErrorResponse } from './run-error.response.js';

export class RunResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['pending', 'running', 'succeeded', 'failed', 'cancelled'] })
  status: RunStatus;

  @ApiProperty({ type: 'object', additionalProperties: true })
  executionPlan: ExecutionPlan;

  @ApiProperty(JSON_VALUE_SCHEMA)
  input: JsonValue;

  @ApiPropertyOptional(JSON_VALUE_SCHEMA)
  result?: JsonValue;

  @ApiPropertyOptional({ type: RunErrorResponse })
  error?: RunErrorResponse;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
