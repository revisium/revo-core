import type { Connection, RecordListData, UserProject } from '../../project-records.js';

export type ListUserProjectsQueryData = RecordListData;

export type ListUserProjectsQueryReturnType = Connection<UserProject>;

export class ListUserProjectsQuery {
  constructor(readonly data: ListUserProjectsQueryData) {}
}
