import type { IPaginatedType } from '@revisium/engine';

import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type ListLaunchProfilesQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly pipelineId?: string;
};

export type ListLaunchProfilesQueryReturnType = IPaginatedType<CatalogRecord>;

export class ListLaunchProfilesQuery {
  constructor(readonly data: ListLaunchProfilesQueryData) {}
}
