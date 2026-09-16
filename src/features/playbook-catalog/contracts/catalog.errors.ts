import { PublicHttpException } from '../../../infrastructure/errors/public-http-exception.js';
import { CatalogErrorText } from './errors.en.js';

export const CatalogError = {
  invalidImport: 'Catalog import is invalid',
  invalidMessage: 'Message is required',
  invalidRelation: 'Catalog relation is invalid',
  recordUnavailable: 'Record unavailable',
} as const;

export class CatalogDefinitionCorruptError extends PublicHttpException {
  constructor(field: 'pipeline' | 'profile') {
    super(
      {
        statusCode: 409,
        code: 'catalog_definition_corrupt',
        message: CatalogErrorText.definitionCorrupt,
        path: `/${field}`,
        details: { reason: 'storage_json' },
      },
      'response',
    );
  }
}
