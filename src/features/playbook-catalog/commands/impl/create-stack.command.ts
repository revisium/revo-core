import type { CatalogRecord } from '../../contracts/catalog.types.js';

export type CreateStackCommandData = {
  readonly id: string;
  readonly playbookId: string;
  readonly body: string;
};

export type CreateStackCommandReturnType = CatalogRecord;

export class CreateStackCommand {
  constructor(readonly data: CreateStackCommandData) {}
}
