import { ApplicationError } from '../../../application/errors/application-error.js';

export const CatalogError = {
  invalidImport: 'Catalog import is invalid',
  invalidMessage: 'Message is required',
  invalidRelation: 'Catalog relation is invalid',
  recordUnavailable: 'Record unavailable',
} as const;

export class CatalogDefinitionCorruptError extends ApplicationError<
  'catalog_definition_corrupt',
  { readonly path: 'pipeline' | 'profile' }
> {
  constructor(path: 'pipeline' | 'profile') {
    super('catalog_definition_corrupt', { path });
  }
}
