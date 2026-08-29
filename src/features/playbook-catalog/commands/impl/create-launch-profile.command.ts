import type { CatalogRecord } from '../../catalog.types.js';

export type CreateLaunchProfileCommandData = {
  readonly id: string;
  readonly pipelineId: string;
  readonly status: string;
  readonly profile: string;
};

export type CreateLaunchProfileCommandReturnType = CatalogRecord;

export class CreateLaunchProfileCommand {
  constructor(readonly data: CreateLaunchProfileCommandData) {}
}
