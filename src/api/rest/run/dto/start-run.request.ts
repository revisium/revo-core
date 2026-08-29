import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
  type ApiBodyOptions,
} from '@nestjs/swagger';
import type { JsonValue, PipelineSourcePackage, RunProfile } from '@revisium/revo-run';

import { CATALOG_RECORD_ID_PATTERN } from '../../../../features/playbook-catalog/contracts/catalog-record-id.js';
import { JSON_VALUE_SCHEMA } from '../../share/json-value.schema.js';

export class StartRunRequest {
  @ApiPropertyOptional({
    type: 'string',
    minLength: 1,
    maxLength: 64,
    pattern: CATALOG_RECORD_ID_PATTERN.source,
  })
  pipelineId?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  pipeline?: PipelineSourcePackage;

  @ApiPropertyOptional({
    type: 'string',
    minLength: 1,
    maxLength: 64,
    pattern: CATALOG_RECORD_ID_PATTERN.source,
  })
  profileId?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  profile?: RunProfile;

  @ApiProperty(JSON_VALUE_SCHEMA)
  input: JsonValue;
}

type ApiBodySchema = Extract<ApiBodyOptions, { schema: unknown }>['schema'];

export const START_RUN_REQUEST_SCHEMA = {
  allOf: [
    { $ref: getSchemaPath(StartRunRequest) },
    {
      oneOf: [
        { required: ['pipelineId'], not: { required: ['pipeline'] } },
        { required: ['pipeline'], not: { required: ['pipelineId'] } },
      ],
    },
    {
      oneOf: [
        { required: ['profileId'], not: { required: ['profile'] } },
        { required: ['profile'], not: { required: ['profileId'] } },
      ],
    },
  ],
} satisfies ApiBodySchema;
