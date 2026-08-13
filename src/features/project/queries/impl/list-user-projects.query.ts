import type { IPaginatedType } from '@revisium/engine';

import type { PageDataType } from '../../commands/utils/getOffsetPagination.js';
import type { GetUserProjectQueryReturnType } from './get-user-project.query.js';

export type ListUserProjectsQueryData = PageDataType;

export type ListUserProjectsQueryReturnType = IPaginatedType<
  NonNullable<GetUserProjectQueryReturnType>
>;

export class ListUserProjectsQuery {
  constructor(readonly data: ListUserProjectsQueryData) {}
}
