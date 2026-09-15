import { HttpException } from '@nestjs/common';

import { CatalogDefinitionCorruptError } from '../../playbook-catalog/contracts/catalog.errors.js';

export function rethrowCatalogReadError(error: unknown): never {
  if (error instanceof HttpException && error.getStatus() === 409) {
    const response = error.getResponse();

    if (isCorruptCatalogResponse(response)) {
      if (response.path === '/pipeline') {
        throw new CatalogDefinitionCorruptError('pipeline');
      }
      throw new CatalogDefinitionCorruptError('profile');
    }
  }

  throw error;
}

function isCorruptCatalogResponse(value: unknown): value is {
  readonly code: 'catalog_definition_corrupt';
  readonly path: '/pipeline' | '/profile';
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    value.code === 'catalog_definition_corrupt' &&
    'path' in value &&
    (value.path === '/pipeline' || value.path === '/profile') &&
    'details' in value &&
    typeof value.details === 'object' &&
    value.details !== null &&
    'reason' in value.details &&
    value.details.reason === 'storage_json'
  );
}
