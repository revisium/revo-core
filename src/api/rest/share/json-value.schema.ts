import type { ApiPropertyOptions } from '@nestjs/swagger';

export const JSON_VALUE_SCHEMA: ApiPropertyOptions = {
  oneOf: [
    { type: 'object', additionalProperties: true },
    { type: 'array', items: {} },
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' },
    { type: 'null' },
  ],
};
