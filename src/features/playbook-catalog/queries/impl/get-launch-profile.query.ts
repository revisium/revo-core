import type { CatalogReadSelector, CatalogRecord } from '../../catalog.types.js';

export type GetLaunchProfileQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetLaunchProfileQueryReturnType = CatalogRecord;

export class GetLaunchProfileQuery {
  constructor(readonly data: GetLaunchProfileQueryData) {}
}
