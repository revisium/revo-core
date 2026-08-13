import type { IPaginatedType } from '@revisium/engine';

import type { CreateWorkItemCommandReturnType } from '../../commands/impl/create-work-item.command.js';
import type { RecordListData } from '../../commands/utils/getOffsetPagination.js';

export type ListWorkItemsQueryData = RecordListData & {
  readonly projectId: string;
};

export type ListWorkItemsQueryReturnType = IPaginatedType<CreateWorkItemCommandReturnType>;

export class ListWorkItemsQuery {
  constructor(readonly data: ListWorkItemsQueryData) {}
}
