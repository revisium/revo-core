import type {
  CatalogPage,
  CatalogReadSelector,
  CatalogRecord,
} from '../../contracts/catalog.types.js';

export type ListRoleRefsQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly roleId?: string;
};

export type ListRoleRefsQueryReturnType = CatalogPage<CatalogRecord>;

export class ListRoleRefsQuery {
  constructor(readonly data: ListRoleRefsQueryData) {}
}
