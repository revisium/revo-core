import type { CatalogRecord } from '../../catalog.types.js';

export type CreateSharedReferenceCommandData = {
  readonly id: string;
  readonly playbookId: string;
  readonly body: string;
};

export type CreateSharedReferenceCommandReturnType = CatalogRecord;

export class CreateSharedReferenceCommand {
  constructor(readonly data: CreateSharedReferenceCommandData) {}
}
