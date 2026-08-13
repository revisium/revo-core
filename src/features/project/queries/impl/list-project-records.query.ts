import type { Connection, ContentTableId, RecordListData } from '../../project-records.js';

export type ListProjectRecordsQueryData = RecordListData & {
  readonly projectId: string;
  readonly tableId: ContentTableId;
};

export type ListProjectRecordsQueryReturnType = Connection<{
  readonly id: string;
  readonly data: unknown;
}>;

export class ListProjectRecordsQuery {
  constructor(readonly data: ListProjectRecordsQueryData) {}
}
