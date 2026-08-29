import type { PipelineSourcePackage } from '@revisium/revo-run';

import type { PipelineRecord } from '../../contracts/catalog.types.js';

export type CreatePipelineCommandData = {
  readonly id: string;
  readonly playbookId: string;
  readonly pipeline: PipelineSourcePackage;
};

export type CreatePipelineCommandReturnType = PipelineRecord;

export class CreatePipelineCommand {
  constructor(readonly data: CreatePipelineCommandData) {}
}
