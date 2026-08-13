export const WORK_ITEM_TABLE_ID = 'WorkItem';

export type WorkItem = {
  id: string;
  title: string;
  cancelled: boolean;
  goal: string;
  inputs: string;
  owner: string;
  constraints: string;
  acceptance: string;
  plan: string;
  dependsOn: string[];
  relatedRequirements: string[];
  relatedAdr: string[];
};

export type WorkItemWriteData = {
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

export function workItemRowData(data: WorkItemWriteData) {
  const { projectId: _projectId, id: _id, ...row } = data;
  return row;
}

export function workItemFromRow(row: { id: string; data: unknown }): WorkItem {
  if (!isWorkItemFields(row.data)) {
    throw new Error('WorkItem row data is invalid.');
  }

  return { id: row.id, ...row.data };
}

function isWorkItemFields(data: unknown): data is Omit<WorkItem, 'id'> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
