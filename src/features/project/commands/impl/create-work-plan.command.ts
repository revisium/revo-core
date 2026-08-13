import type { WorkPlan, WorkPlanWriteData } from '../../work-plan.js';

export type CreateWorkPlanCommandData = WorkPlanWriteData;

export type CreateWorkPlanCommandReturnType = WorkPlan;

export class CreateWorkPlanCommand {
  constructor(readonly data: CreateWorkPlanCommandData) {}
}
