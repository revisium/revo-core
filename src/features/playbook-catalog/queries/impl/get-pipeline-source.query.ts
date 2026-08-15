import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type GetPipelineSourceQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetPipelineSourceQueryReturnType = CatalogRecord;

export class GetPipelineSourceQuery {
  constructor(readonly data: GetPipelineSourceQueryData) {}
}
