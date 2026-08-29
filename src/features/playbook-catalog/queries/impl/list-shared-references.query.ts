import type {
  CatalogPage,
  CatalogReadSelector,
  CatalogRecord,
} from '../../contracts/catalog.types.js';

export type ListSharedReferencesQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly playbookId?: string;
};

export type ListSharedReferencesQueryReturnType = CatalogPage<CatalogRecord>;

export class ListSharedReferencesQuery {
  constructor(readonly data: ListSharedReferencesQueryData) {}
}
