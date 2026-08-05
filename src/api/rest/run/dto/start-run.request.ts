import { ApiProperty } from '@nestjs/swagger';
import type { JsonValue, PipelineDefinition } from '@revisium/revo-pipeline';

import { JSON_VALUE_SCHEMA } from '../../share/json-value.schema.js';

export class StartRunRequest {
  @ApiProperty({ type: 'object', additionalProperties: true })
  pipeline: PipelineDefinition;

  @ApiProperty(JSON_VALUE_SCHEMA)
  input: JsonValue;
}
