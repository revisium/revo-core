export type CreateWorkItemCommandData = {
  readonly projectId: string;
  readonly id: string;
  readonly title: string;
  readonly cancelled: boolean;
  readonly goal: string;
  readonly inputs: string;
  readonly owner: string;
  readonly constraints: string;
  readonly acceptance: string;
  readonly plan: string;
  readonly dependsOn: readonly string[];
  readonly relatedRequirements: readonly string[];
  readonly relatedAdr: readonly string[];
};

export type CreateWorkItemCommandReturnType = { id: string } & Record<string, unknown>;

export class CreateWorkItemCommand {
  constructor(readonly data: CreateWorkItemCommandData) {}
}
