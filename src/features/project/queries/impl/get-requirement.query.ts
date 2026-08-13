import type { Requirement } from '../../requirement.js';

export type GetRequirementQueryData = {
  readonly projectId: string;
  readonly id: string;
};

export type GetRequirementQueryReturnType = Requirement | null;

export class GetRequirementQuery {
  constructor(readonly data: GetRequirementQueryData) {}
}
