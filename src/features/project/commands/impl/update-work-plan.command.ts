import type {
  CreateWorkPlanCommandData,
  CreateWorkPlanCommandReturnType,
} from './create-work-plan.command.js';

export type UpdateWorkPlanCommandData = CreateWorkPlanCommandData;

export type UpdateWorkPlanCommandReturnType = CreateWorkPlanCommandReturnType;

export class UpdateWorkPlanCommand {
  constructor(readonly data: UpdateWorkPlanCommandData) {}
}
