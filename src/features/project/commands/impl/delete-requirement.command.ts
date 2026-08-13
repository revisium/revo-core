export type DeleteRequirementCommandData = {
  readonly projectId: string;
  readonly id: string;
};

export type DeleteRequirementCommandReturnType = boolean;

export class DeleteRequirementCommand {
  constructor(readonly data: DeleteRequirementCommandData) {}
}
