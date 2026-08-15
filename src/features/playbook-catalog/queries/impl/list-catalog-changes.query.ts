import type { CatalogChanges } from '../../catalog.types.js';

export type ListCatalogChangesQueryData = {
  readonly first: number;
  readonly after?: string;
};

export type ListCatalogChangesQueryReturnType = CatalogChanges;

export class ListCatalogChangesQuery {
  constructor(readonly data: ListCatalogChangesQueryData) {}
}
