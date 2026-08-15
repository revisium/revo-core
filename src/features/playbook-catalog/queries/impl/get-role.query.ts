import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type GetRoleQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetRoleQueryReturnType = CatalogRecord;

export class GetRoleQuery {
  constructor(readonly data: GetRoleQueryData) {}
}
