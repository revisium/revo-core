import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type GetStackRefQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetStackRefQueryReturnType = CatalogRecord;

export class GetStackRefQuery {
  constructor(readonly data: GetStackRefQueryData) {}
}
