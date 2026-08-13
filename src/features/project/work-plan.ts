export const WORK_PLAN_TABLE_ID = 'WorkPlan';

export type WorkPlanStatus = 'draft' | 'ready' | 'closed';

export type WorkPlan = {
  id: string;
  title: string;
  status: WorkPlanStatus;
  outcome: string;
  bounds: string;
  baselineId: string;
  acceptance: string;
};

export type WorkPlanWriteData = {
  readonly projectId: string;
  readonly id: string;
  readonly title: string;
  readonly status: WorkPlanStatus;
  readonly outcome: string;
  readonly bounds: string;
  readonly baselineId: string;
  readonly acceptance: string;
};

export function workPlanRowData(data: WorkPlanWriteData) {
  const { projectId: _projectId, id: _id, ...row } = data;
  return row;
}

export function workPlanFromRow(row: { id: string; data: unknown }): WorkPlan {
  if (!isWorkPlanFields(row.data)) {
    throw new Error('WorkPlan row data is invalid.');
  }

  return { id: row.id, ...row.data };
}

function isWorkPlanFields(data: unknown): data is Omit<WorkPlan, 'id'> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
