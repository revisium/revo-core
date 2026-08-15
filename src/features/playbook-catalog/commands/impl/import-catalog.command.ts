import type { CatalogImportResult } from '../../catalog.types.js';

export type ImportCatalogCommandData = {
  readonly payload: unknown;
};

export type ImportCatalogCommandReturnType = CatalogImportResult;

export class ImportCatalogCommand {
  constructor(readonly data: ImportCatalogCommandData) {}
}
