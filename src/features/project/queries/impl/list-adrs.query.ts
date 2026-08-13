import type { IPaginatedType } from '@revisium/engine';

import type { Adr } from '../../adr.js';
import type { RecordListData } from '../../get-offset-pagination.js';

export type ListAdrsQueryData = RecordListData & {
  readonly projectId: string;
};

export type ListAdrsQueryReturnType = IPaginatedType<Adr>;

export class ListAdrsQuery {
  constructor(readonly data: ListAdrsQueryData) {}
}
