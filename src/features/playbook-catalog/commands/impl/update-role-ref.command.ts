import type { CatalogRecord } from '../../catalog.types.js';

export type UpdateRoleRefCommandData = {
  readonly id: string;
  readonly roleId: string;
  readonly body: string;
};

export type UpdateRoleRefCommandReturnType = CatalogRecord;

export class UpdateRoleRefCommand {
  constructor(readonly data: UpdateRoleRefCommandData) {}
}
