import type { WorkItem, WorkItemWriteData } from '../../work-item.js';

export type UpdateWorkItemCommandData = WorkItemWriteData;

export type UpdateWorkItemCommandReturnType = WorkItem;

export class UpdateWorkItemCommand {
  constructor(readonly data: UpdateWorkItemCommandData) {}
}
