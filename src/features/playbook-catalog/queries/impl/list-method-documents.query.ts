import type {
  CatalogPage,
  CatalogReadSelector,
  CatalogRecord,
} from '../../contracts/catalog.types.js';

export type ListMethodDocumentsQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly playbookId?: string;
};

export type ListMethodDocumentsQueryReturnType = CatalogPage<CatalogRecord>;

export class ListMethodDocumentsQuery {
  constructor(readonly data: ListMethodDocumentsQueryData) {}
}
