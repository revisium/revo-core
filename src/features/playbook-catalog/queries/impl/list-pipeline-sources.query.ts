import type { IPaginatedType } from '@revisium/engine';

import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type ListPipelineSourcesQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly pipelineId?: string;
};

export type ListPipelineSourcesQueryReturnType = IPaginatedType<CatalogRecord>;

export class ListPipelineSourcesQuery {
  constructor(readonly data: ListPipelineSourcesQueryData) {}
}
