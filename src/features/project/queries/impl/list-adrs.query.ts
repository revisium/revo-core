import type { IPaginatedType } from '@revisium/engine';

import type { CreateAdrCommandReturnType } from '../../commands/impl/create-adr.command.js';
import type { RecordListData } from '../../commands/utils/getOffsetPagination.js';

export type ListAdrsQueryData = RecordListData & {
  readonly projectId: string;
};

export type ListAdrsQueryReturnType = IPaginatedType<CreateAdrCommandReturnType>;

export class ListAdrsQuery {
  constructor(readonly data: ListAdrsQueryData) {}
}
