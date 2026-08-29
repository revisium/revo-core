import type { CatalogReadSelector, PipelineRecord } from '../../contracts/catalog.types.js';

export type GetPipelineQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetPipelineQueryReturnType = PipelineRecord;

export class GetPipelineQuery {
  constructor(readonly data: GetPipelineQueryData) {}
}
