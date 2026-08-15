import type { IPaginatedType } from '@revisium/engine';

import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type ListPipelineRolesQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly pipelineId?: string;
};

export type ListPipelineRolesQueryReturnType = IPaginatedType<CatalogRecord>;

export class ListPipelineRolesQuery {
  constructor(readonly data: ListPipelineRolesQueryData) {}
}
