import type { CatalogRecord } from '../../catalog.types.js';

export type UpdatePipelineSourceCommandData = {
  readonly id: string;
  readonly pipelineId: string;
  readonly sourceJson: string;
};

export type UpdatePipelineSourceCommandReturnType = CatalogRecord;

export class UpdatePipelineSourceCommand {
  constructor(readonly data: UpdatePipelineSourceCommandData) {}
}
