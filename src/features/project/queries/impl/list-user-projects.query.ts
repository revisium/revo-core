import type { IPaginatedType } from '@revisium/engine';

import type { RecordListData } from '../../get-offset-pagination.js';
import type { UserProject } from '../../user-project.js';

export type ListUserProjectsQueryData = RecordListData;

export type ListUserProjectsQueryReturnType = IPaginatedType<UserProject>;

export class ListUserProjectsQuery {
  constructor(readonly data: ListUserProjectsQueryData) {}
}
