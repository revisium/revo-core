import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type GetPipelineQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetPipelineQueryReturnType = CatalogRecord;

export class GetPipelineQuery {
  constructor(readonly data: GetPipelineQueryData) {}
}
