import type { IPaginatedType } from '@revisium/engine';

import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type ListRolesQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly playbookId?: string;
};

export type ListRolesQueryReturnType = IPaginatedType<CatalogRecord>;

export class ListRolesQuery {
  constructor(readonly data: ListRolesQueryData) {}
}
