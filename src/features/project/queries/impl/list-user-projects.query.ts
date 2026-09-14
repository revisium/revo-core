import type { IPaginatedType } from '@revisium/engine';

import type { GetUserProjectQueryReturnType } from './get-user-project.query.js';

export type ListUserProjectsQueryData = {
  readonly first?: number;
  readonly after?: string;
  readonly includeArchived?: boolean;
  readonly query?: string;
};

export type ListUserProjectsQueryReturnType = IPaginatedType<
  NonNullable<GetUserProjectQueryReturnType>
>;

export class ListUserProjectsQuery {
  constructor(readonly data: ListUserProjectsQueryData) {}
}
