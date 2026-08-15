import type { IPaginatedType } from '@revisium/engine';

import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type ListPipelineSlotsQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly pipelineId?: string;
};

export type ListPipelineSlotsQueryReturnType = IPaginatedType<CatalogRecord>;

export class ListPipelineSlotsQuery {
  constructor(readonly data: ListPipelineSlotsQueryData) {}
}
