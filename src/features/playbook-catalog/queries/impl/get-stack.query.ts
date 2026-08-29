import type { CatalogReadSelector, CatalogRecord } from '../../contracts/catalog.types.js';

export type GetStackQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetStackQueryReturnType = CatalogRecord;

export class GetStackQuery {
  constructor(readonly data: GetStackQueryData) {}
}
