import type { CatalogRecord } from '../../catalog.types.js';

export type UpdateRoleCommandData = {
  readonly id: string;
  readonly playbookId: string;
  readonly body: string;
};

export type UpdateRoleCommandReturnType = CatalogRecord;

export class UpdateRoleCommand {
  constructor(readonly data: UpdateRoleCommandData) {}
}
