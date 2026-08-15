import type { CatalogRecord } from '../../catalog.types.js';

export type UpdatePlaybookCommandData = {
  readonly id: string;
  readonly name: string;
};

export type UpdatePlaybookCommandReturnType = CatalogRecord;

export class UpdatePlaybookCommand {
  constructor(readonly data: UpdatePlaybookCommandData) {}
}
