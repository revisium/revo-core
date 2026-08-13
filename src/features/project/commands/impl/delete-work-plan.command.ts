export type DeleteWorkPlanCommandData = {
  readonly projectId: string;
  readonly id: string;
};

export type DeleteWorkPlanCommandReturnType = boolean;

export class DeleteWorkPlanCommand {
  constructor(readonly data: DeleteWorkPlanCommandData) {}
}
