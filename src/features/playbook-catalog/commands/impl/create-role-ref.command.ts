import type { CatalogRecord } from '../../catalog.types.js';

export type CreateRoleRefCommandData = {
  readonly id: string;
  readonly roleId: string;
  readonly body: string;
};

export type CreateRoleRefCommandReturnType = CatalogRecord;

export class CreateRoleRefCommand {
  constructor(readonly data: CreateRoleRefCommandData) {}
}
