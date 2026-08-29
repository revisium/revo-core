import type { CatalogReadSelector, CatalogRecord } from '../../contracts/catalog.types.js';

export type GetPipelineRoleQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetPipelineRoleQueryReturnType = CatalogRecord;

export class GetPipelineRoleQuery {
  constructor(readonly data: GetPipelineRoleQueryData) {}
}
