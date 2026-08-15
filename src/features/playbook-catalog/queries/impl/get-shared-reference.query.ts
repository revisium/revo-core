import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type GetSharedReferenceQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetSharedReferenceQueryReturnType = CatalogRecord;

export class GetSharedReferenceQuery {
  constructor(readonly data: GetSharedReferenceQueryData) {}
}
