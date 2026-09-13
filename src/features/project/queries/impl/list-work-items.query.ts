import type { IPaginatedType } from '@revisium/engine';

import type { PageDataType } from '../../../../infrastructure/pagination/get-offset-pagination.js';
import type { CreateWorkItemCommandReturnType } from '../../commands/impl/create-work-item.command.js';

export type ListWorkItemsQueryData = PageDataType & {
  readonly projectId: string;
};

export type ListWorkItemsQueryReturnType = IPaginatedType<CreateWorkItemCommandReturnType>;

export class ListWorkItemsQuery {
  constructor(readonly data: ListWorkItemsQueryData) {}
}
