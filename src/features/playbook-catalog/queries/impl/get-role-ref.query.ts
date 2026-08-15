import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type GetRoleRefQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetRoleRefQueryReturnType = CatalogRecord;

export class GetRoleRefQuery {
  constructor(readonly data: GetRoleRefQueryData) {}
}
