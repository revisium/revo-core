import type { ListUserProjectsQueryData } from '../../../features/project/queries/index.js';

export type ProjectListQuery = {
  readonly first?: number | undefined;
  readonly after?: string | undefined;
  readonly includeArchived?: boolean | undefined;
  readonly query?: string | undefined;
};

export function projectListQuery(query: ProjectListQuery): ListUserProjectsQueryData {
  return {
    ...(query.first === undefined ? {} : { first: query.first }),
    ...(query.after === undefined ? {} : { after: query.after }),
    ...(query.includeArchived === undefined ? {} : { includeArchived: query.includeArchived }),
    ...(query.query === undefined ? {} : { query: query.query }),
  };
}
