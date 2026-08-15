import type { IPaginatedType } from '@revisium/engine';

import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type ListStackRefsQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly stackId?: string;
};

export type ListStackRefsQueryReturnType = IPaginatedType<CatalogRecord>;

export class ListStackRefsQuery {
  constructor(readonly data: ListStackRefsQueryData) {}
}
