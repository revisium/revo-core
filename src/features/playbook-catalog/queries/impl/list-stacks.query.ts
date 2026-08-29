import type {
  CatalogPage,
  CatalogReadSelector,
  CatalogRecord,
} from '../../contracts/catalog.types.js';

export type ListStacksQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly playbookId?: string;
};

export type ListStacksQueryReturnType = CatalogPage<CatalogRecord>;

export class ListStacksQuery {
  constructor(readonly data: ListStacksQueryData) {}
}
