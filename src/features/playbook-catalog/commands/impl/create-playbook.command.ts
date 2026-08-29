import type { CatalogRecord } from '../../contracts/catalog.types.js';

export type CreatePlaybookCommandData = {
  readonly id: string;
  readonly name: string;
};

export type CreatePlaybookCommandReturnType = CatalogRecord;

export class CreatePlaybookCommand {
  constructor(readonly data: CreatePlaybookCommandData) {}
}
