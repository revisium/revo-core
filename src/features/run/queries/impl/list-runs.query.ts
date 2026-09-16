import type { IPaginatedType } from '@revisium/engine';
import type { RunSnapshot } from '@revisium/revo-run';

import type { PageDataType } from '../../../../infrastructure/pagination/get-offset-pagination.js';

export type ListRunsQueryData = PageDataType & {
  readonly projectId: string;
  readonly statuses?: readonly unknown[];
};

export type RunListItem = RunSnapshot & { readonly projectId: string };
export type ListRunsQueryReturnType = IPaginatedType<RunListItem>;

export class ListRunsQuery {
  constructor(readonly data: ListRunsQueryData) {}
}
