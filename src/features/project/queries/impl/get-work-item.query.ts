import type { WorkItem } from '../../work-item.js';

export type GetWorkItemQueryData = {
  readonly projectId: string;
  readonly id: string;
};

export type GetWorkItemQueryReturnType = WorkItem | null;

export class GetWorkItemQuery {
  constructor(readonly data: GetWorkItemQueryData) {}
}
