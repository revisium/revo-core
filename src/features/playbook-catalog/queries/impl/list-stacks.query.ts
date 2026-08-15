import type { IPaginatedType } from '@revisium/engine';

import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type ListStacksQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly playbookId?: string;
};

export type ListStacksQueryReturnType = IPaginatedType<CatalogRecord>;

export class ListStacksQuery {
  constructor(readonly data: ListStacksQueryData) {}
}
