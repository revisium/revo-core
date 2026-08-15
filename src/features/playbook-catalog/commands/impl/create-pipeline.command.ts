import type { CatalogRecord } from '../../catalog.types.js';

export type CreatePipelineCommandData = {
  readonly id: string;
  readonly playbookId: string;
  readonly body: string;
};

export type CreatePipelineCommandReturnType = CatalogRecord;

export class CreatePipelineCommand {
  constructor(readonly data: CreatePipelineCommandData) {}
}
