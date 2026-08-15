import type { IPaginatedType } from '@revisium/engine';

import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type ListMethodDocumentsQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly playbookId?: string;
};

export type ListMethodDocumentsQueryReturnType = IPaginatedType<CatalogRecord>;

export class ListMethodDocumentsQuery {
  constructor(readonly data: ListMethodDocumentsQueryData) {}
}
