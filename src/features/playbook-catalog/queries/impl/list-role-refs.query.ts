import type { IPaginatedType } from '@revisium/engine';

import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type ListRoleRefsQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly roleId?: string;
};

export type ListRoleRefsQueryReturnType = IPaginatedType<CatalogRecord>;

export class ListRoleRefsQuery {
  constructor(readonly data: ListRoleRefsQueryData) {}
}
