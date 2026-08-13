import type { IPaginatedType } from '@revisium/engine';

import type { RecordListData } from '../../commands/utils/getOffsetPagination.js';
import type { GetUserProjectQueryReturnType } from './get-user-project.query.js';

export type ListUserProjectsQueryData = RecordListData;

export type ListUserProjectsQueryReturnType = IPaginatedType<
  NonNullable<GetUserProjectQueryReturnType>
>;

export class ListUserProjectsQuery {
  constructor(readonly data: ListUserProjectsQueryData) {}
}
