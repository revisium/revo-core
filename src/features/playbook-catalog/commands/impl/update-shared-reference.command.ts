import type { CatalogRecord } from '../../catalog.types.js';

export type UpdateSharedReferenceCommandData = {
  readonly id: string;
  readonly playbookId: string;
  readonly body: string;
};

export type UpdateSharedReferenceCommandReturnType = CatalogRecord;

export class UpdateSharedReferenceCommand {
  constructor(readonly data: UpdateSharedReferenceCommandData) {}
}
