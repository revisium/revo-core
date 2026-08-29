import type { CatalogImportResult } from '../../contracts/catalog.types.js';

export type ImportCatalogCommandData = {
  readonly payload: unknown;
};

export type ImportCatalogCommandReturnType = CatalogImportResult;

export class ImportCatalogCommand {
  constructor(readonly data: ImportCatalogCommandData) {}
}
