import type { CatalogRecord } from '../../catalog.types.js';

export type UpdateLaunchProfileCommandData = {
  readonly id: string;
  readonly pipelineId: string;
  readonly status: string;
  readonly profile: string;
};

export type UpdateLaunchProfileCommandReturnType = CatalogRecord;

export class UpdateLaunchProfileCommand {
  constructor(readonly data: UpdateLaunchProfileCommandData) {}
}
