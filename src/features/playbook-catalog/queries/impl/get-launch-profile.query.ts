import type { CatalogReadSelector, LaunchProfileRecord } from '../../contracts/catalog.types.js';

export type GetLaunchProfileQueryData = CatalogReadSelector & {
  readonly id: string;
};

export type GetLaunchProfileQueryReturnType = LaunchProfileRecord;

export class GetLaunchProfileQuery {
  constructor(readonly data: GetLaunchProfileQueryData) {}
}
