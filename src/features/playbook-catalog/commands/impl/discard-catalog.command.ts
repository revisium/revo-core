import type { CatalogMutationResult } from '../../contracts/catalog.types.js';

export type DiscardCatalogCommandReturnType = CatalogMutationResult;

export class DiscardCatalogCommand {
  readonly kind = 'discardCatalog';
}
