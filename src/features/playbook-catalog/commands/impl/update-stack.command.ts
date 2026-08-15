import type { CatalogRecord } from '../../catalog.types.js';

export type UpdateStackCommandData = {
  readonly id: string;
  readonly playbookId: string;
  readonly body: string;
};

export type UpdateStackCommandReturnType = CatalogRecord;

export class UpdateStackCommand {
  constructor(readonly data: UpdateStackCommandData) {}
}
