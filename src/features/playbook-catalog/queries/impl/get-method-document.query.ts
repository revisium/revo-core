import type { CatalogReadSelector, CatalogRecord } from '../../contracts/catalog.types.js';

export type GetMethodDocumentQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetMethodDocumentQueryReturnType = CatalogRecord;

export class GetMethodDocumentQuery {
  constructor(readonly data: GetMethodDocumentQueryData) {}
}
