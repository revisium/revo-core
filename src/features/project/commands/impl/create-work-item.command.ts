import type { WorkItem, WorkItemWriteData } from '../../work-item.js';

export type CreateWorkItemCommandData = WorkItemWriteData;

export type CreateWorkItemCommandReturnType = WorkItem;

export class CreateWorkItemCommand {
  constructor(readonly data: CreateWorkItemCommandData) {}
}
