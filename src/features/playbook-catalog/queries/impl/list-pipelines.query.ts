import type { IPaginatedType } from '@revisium/engine';

import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type ListPipelinesQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly playbookId?: string;
};

export type ListPipelinesQueryReturnType = IPaginatedType<CatalogRecord>;

export class ListPipelinesQuery {
  constructor(readonly data: ListPipelinesQueryData) {}
}
