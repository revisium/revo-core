import type { CatalogRecord } from '../../catalog.types.js';

export type UpdateStackRefCommandData = {
  readonly id: string;
  readonly stackId: string;
  readonly body: string;
};

export type UpdateStackRefCommandReturnType = CatalogRecord;

export class UpdateStackRefCommand {
  constructor(readonly data: UpdateStackRefCommandData) {}
}
