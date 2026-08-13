export type RequirementStatus = 'proposed' | 'accepted' | 'deferred' | 'rejected';

export type CreateRequirementCommandData = {
  readonly projectId: string;
  readonly id: string;
  readonly title: string;
  readonly status: RequirementStatus;
  readonly statement: string;
  readonly acceptance: string;
  readonly relatedAdr: readonly string[];
};

export type CreateRequirementCommandReturnType = { id: string } & Record<string, unknown>;

export class CreateRequirementCommand {
  constructor(readonly data: CreateRequirementCommandData) {}
}
