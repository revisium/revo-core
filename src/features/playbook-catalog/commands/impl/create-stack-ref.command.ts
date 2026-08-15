import type { CatalogRecord } from '../../catalog.types.js';

export type CreateStackRefCommandData = {
  readonly id: string;
  readonly stackId: string;
  readonly body: string;
};

export type CreateStackRefCommandReturnType = CatalogRecord;

export class CreateStackRefCommand {
  constructor(readonly data: CreateStackRefCommandData) {}
}
