import type { WorkPlan } from '../../work-plan.js';

export type GetWorkPlanQueryData = {
  readonly projectId: string;
  readonly id: string;
};

export type GetWorkPlanQueryReturnType = WorkPlan | null;

export class GetWorkPlanQuery {
  constructor(readonly data: GetWorkPlanQueryData) {}
}
