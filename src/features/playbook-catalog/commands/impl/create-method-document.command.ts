import type { CatalogRecord } from '../../catalog.types.js';

export type CreateMethodDocumentCommandData = {
  readonly id: string;
  readonly playbookId: string;
  readonly kind: string;
  readonly body: string;
};

export type CreateMethodDocumentCommandReturnType = CatalogRecord;

export class CreateMethodDocumentCommand {
  constructor(readonly data: CreateMethodDocumentCommandData) {}
}
