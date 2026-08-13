import type { WorkPlan, WorkPlanWriteData } from '../../work-plan.js';

export type UpdateWorkPlanCommandData = WorkPlanWriteData;

export type UpdateWorkPlanCommandReturnType = WorkPlan;

export class UpdateWorkPlanCommand {
  constructor(readonly data: UpdateWorkPlanCommandData) {}
}
