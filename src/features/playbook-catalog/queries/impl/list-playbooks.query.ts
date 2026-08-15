import type { IPaginatedType } from '@revisium/engine';

import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type ListPlaybooksQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
};

export type ListPlaybooksQueryReturnType = IPaginatedType<CatalogRecord>;

export class ListPlaybooksQuery {
  constructor(readonly data: ListPlaybooksQueryData) {}
}
