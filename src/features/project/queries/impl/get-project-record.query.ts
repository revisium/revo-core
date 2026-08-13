import type { ContentTableId } from '../../project-records.js';

export type GetProjectRecordQueryData = {
  readonly projectId: string;
  readonly tableId: ContentTableId;
  readonly rowId: string;
};

export type GetProjectRecordQueryReturnType = {
  readonly id: string;
  readonly data: unknown;
} | null;

export class GetProjectRecordQuery {
  constructor(readonly data: GetProjectRecordQueryData) {}
}
