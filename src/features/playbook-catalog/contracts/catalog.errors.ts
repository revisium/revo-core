import { ApplicationError } from '../../../application/errors/application-error.js';

export const CatalogError = {
  invalidImport: 'Catalog import is invalid',
  invalidMessage: 'Message is required',
  invalidRelation: 'Catalog relation is invalid',
  recordUnavailable: 'Record unavailable',
} as const;

export const CatalogErrorCode = { definitionCorrupt: 'catalog_definition_corrupt' } as const;

export type CatalogDefinitionCorruptFailure = Readonly<{
  code: 'catalog_definition_corrupt';
  details: { readonly field: 'pipeline' | 'profile' };
}>;

export class CatalogDefinitionCorruptError extends ApplicationError<CatalogDefinitionCorruptFailure> {
  constructor(path: 'pipeline' | 'profile') {
    super({ code: 'catalog_definition_corrupt', details: { field: path } });
  }
}
