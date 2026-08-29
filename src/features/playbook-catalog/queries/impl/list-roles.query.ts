import type {
  CatalogPage,
  CatalogReadSelector,
  CatalogRecord,
} from '../../contracts/catalog.types.js';

export type ListRolesQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly playbookId?: string;
};

export type ListRolesQueryReturnType = CatalogPage<CatalogRecord>;

export class ListRolesQuery {
  constructor(readonly data: ListRolesQueryData) {}
}
