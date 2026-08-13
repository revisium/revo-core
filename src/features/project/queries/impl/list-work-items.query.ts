import type { IPaginatedType } from '@revisium/engine';

import type { RecordListData } from '../../get-offset-pagination.js';
import type { WorkItem } from '../../work-item.js';

export type ListWorkItemsQueryData = RecordListData & {
  readonly projectId: string;
};

export type ListWorkItemsQueryReturnType = IPaginatedType<WorkItem>;

export class ListWorkItemsQuery {
  constructor(readonly data: ListWorkItemsQueryData) {}
}
