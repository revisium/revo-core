import type { CreateWorkPlanCommandReturnType } from '../../commands/impl/create-work-plan.command.js';

export type GetWorkPlanQueryData = {
  readonly projectId: string;
  readonly id: string;
};

export type GetWorkPlanQueryReturnType = CreateWorkPlanCommandReturnType | null;

export class GetWorkPlanQuery {
  constructor(readonly data: GetWorkPlanQueryData) {}
}
