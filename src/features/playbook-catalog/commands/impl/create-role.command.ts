import type { CatalogRecord } from '../../catalog.types.js';

export type CreateRoleCommandData = {
  readonly id: string;
  readonly playbookId: string;
  readonly body: string;
};

export type CreateRoleCommandReturnType = CatalogRecord;

export class CreateRoleCommand {
  constructor(readonly data: CreateRoleCommandData) {}
}
