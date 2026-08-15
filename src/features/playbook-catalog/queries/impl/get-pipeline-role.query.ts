import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type GetPipelineRoleQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetPipelineRoleQueryReturnType = CatalogRecord;

export class GetPipelineRoleQuery {
  constructor(readonly data: GetPipelineRoleQueryData) {}
}
