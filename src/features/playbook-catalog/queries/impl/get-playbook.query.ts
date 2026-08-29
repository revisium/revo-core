import type { CatalogReadSelector, CatalogRecord } from '../../contracts/catalog.types.js';

export type GetPlaybookQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetPlaybookQueryReturnType = CatalogRecord;

export class GetPlaybookQuery {
  constructor(readonly data: GetPlaybookQueryData) {}
}
