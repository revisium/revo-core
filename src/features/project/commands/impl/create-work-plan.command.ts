export type WorkPlanStatus = 'draft' | 'ready' | 'closed';

export type CreateWorkPlanCommandData = {
  readonly projectId: string;
  readonly id: string;
  readonly title: string;
  readonly status: WorkPlanStatus;
  readonly outcome: string;
  readonly bounds: string;
  readonly baselineId: string;
  readonly acceptance: string;
};

export type CreateWorkPlanCommandReturnType = { id: string } & Record<string, unknown>;

export class CreateWorkPlanCommand {
  constructor(readonly data: CreateWorkPlanCommandData) {}
}
