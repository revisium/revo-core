import type { CatalogRecord } from '../../catalog.types.js';

export type CreatePipelineRoleCommandData = {
  readonly id: string;
  readonly pipelineId: string;
  readonly roleId: string;
  readonly membership: string;
};

export type CreatePipelineRoleCommandReturnType = CatalogRecord;

export class CreatePipelineRoleCommand {
  constructor(readonly data: CreatePipelineRoleCommandData) {}
}
