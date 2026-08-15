import type { IPaginatedType } from '@revisium/engine';

import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type ListSharedReferencesQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly playbookId?: string;
};

export type ListSharedReferencesQueryReturnType = IPaginatedType<CatalogRecord>;

export class ListSharedReferencesQuery {
  constructor(readonly data: ListSharedReferencesQueryData) {}
}
