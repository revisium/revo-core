import type { PipelineSourcePackage } from '@revisium/revo-run';

import type { PipelineRecord } from '../../contracts/catalog.types.js';

export type UpdatePipelineCommandData = {
  readonly id: string;
  readonly playbookId: string;
  readonly pipeline: PipelineSourcePackage;
};

export type UpdatePipelineCommandReturnType = PipelineRecord;

export class UpdatePipelineCommand {
  constructor(readonly data: UpdatePipelineCommandData) {}
}
