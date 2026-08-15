import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type GetPipelineSlotQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetPipelineSlotQueryReturnType = CatalogRecord;

export class GetPipelineSlotQuery {
  constructor(readonly data: GetPipelineSlotQueryData) {}
}
