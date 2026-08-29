import type { CatalogSnapshot } from '../../contracts/catalog.types.js';

export type GetCatalogSnapshotQueryData = {
  readonly revisionId: string;
};

export type GetCatalogSnapshotQueryReturnType = CatalogSnapshot;

export class GetCatalogSnapshotQuery {
  constructor(readonly data: GetCatalogSnapshotQueryData) {}
}
