import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export function ApiCatalogScope() {
  return applyDecorators(
    ApiQuery({ name: 'scope', enum: ['HEAD', 'DRAFT', 'REVISION'], required: false }),
    ApiQuery({ name: 'revisionId', type: String, required: false }),
  );
}

export function ApiCatalogList() {
  return applyDecorators(
    ApiCatalogScope(),
    ApiQuery({ name: 'first', type: Number, required: false, default: 100, maximum: 1000 }),
    ApiQuery({ name: 'after', type: String, required: false }),
  );
}
