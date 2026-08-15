import type { CatalogRecord } from '../../catalog.types.js';

export type UpdatePipelineCommandData = {
  readonly id: string;
  readonly playbookId: string;
  readonly body: string;
};

export type UpdatePipelineCommandReturnType = CatalogRecord;

export class UpdatePipelineCommand {
  constructor(readonly data: UpdatePipelineCommandData) {}
}
