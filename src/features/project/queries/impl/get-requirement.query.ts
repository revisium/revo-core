import type { CreateRequirementCommandReturnType } from '../../commands/impl/create-requirement.command.js';

export type GetRequirementQueryData = {
  readonly projectId: string;
  readonly id: string;
};

export type GetRequirementQueryReturnType = CreateRequirementCommandReturnType | null;

export class GetRequirementQuery {
  constructor(readonly data: GetRequirementQueryData) {}
}
