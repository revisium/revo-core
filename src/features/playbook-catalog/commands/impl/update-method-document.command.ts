import type { CatalogRecord } from '../../catalog.types.js';

export type UpdateMethodDocumentCommandData = {
  readonly id: string;
  readonly playbookId: string;
  readonly kind: string;
  readonly body: string;
};

export type UpdateMethodDocumentCommandReturnType = CatalogRecord;

export class UpdateMethodDocumentCommand {
  constructor(readonly data: UpdateMethodDocumentCommandData) {}
}
