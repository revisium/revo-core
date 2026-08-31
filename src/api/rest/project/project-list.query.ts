import type { ListUserProjectsQueryData } from '../../../features/project/queries/index.js';

export type ProjectListQuery = {
  readonly first?: string | undefined;
  readonly after?: string | undefined;
  readonly includeArchived?: string | undefined;
  readonly query?: string | undefined;
};

export function projectListQuery(query: ProjectListQuery): ListUserProjectsQueryData {
  return {
    ...(query.first === undefined ? {} : { first: Number(query.first) }),
    ...(query.after === undefined ? {} : { after: query.after }),
    ...(query.includeArchived === undefined
      ? {}
      : { includeArchived: query.includeArchived === 'true' }),
    ...(query.query === undefined ? {} : { query: query.query }),
  };
}
