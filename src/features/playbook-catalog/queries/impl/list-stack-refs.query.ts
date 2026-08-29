import type {
  CatalogPage,
  CatalogReadSelector,
  CatalogRecord,
} from '../../contracts/catalog.types.js';

export type ListStackRefsQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly stackId?: string;
};

export type ListStackRefsQueryReturnType = CatalogPage<CatalogRecord>;

export class ListStackRefsQuery {
  constructor(readonly data: ListStackRefsQueryData) {}
}
